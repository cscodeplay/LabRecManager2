#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT_DIR/certs"
NATIVE_WWW="$ROOT_DIR/client/native-www"
mkdir -p "$CERT_DIR" "$NATIVE_WWW"

LAN_IP="${1:-$(ipconfig getifaddr en0 || ifconfig | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}')}"
if [ -z "$LAN_IP" ]; then
  LAN_IP="192.168.1.220"
fi

echo "Using LAN IP: $LAN_IP"

CA_KEY="$CERT_DIR/labrec-rootCA.key"
CA_CRT="$CERT_DIR/labrec-rootCA.crt"
CA_CER="$NATIVE_WWW/labrec-rootCA.cer"

if [ ! -f "$CA_KEY" ] || [ ! -f "$CA_CRT" ]; then
  echo "Generating persistent LabRec Local Root CA..."
  CA_CFG="$(mktemp)"
  cat > "$CA_CFG" <<EOF
[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no

[dn]
C = IN
O = LabRec Manager
CN = LabRec Manager Local Root CA

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
EOF
  openssl ecparam -name prime256v1 -genkey -noout -out "$CA_KEY"
  openssl req -x509 -new -nodes -key "$CA_KEY" -sha256 -days 3650 \
    -out "$CA_CRT" -config "$CA_CFG"
  rm -f "$CA_CFG"
fi

# DER format for iOS bundle & mobileconfig
openssl x509 -in "$CA_CRT" -outform DER -out "$CA_CER"

# Leaf server cert (<= 397 days per Apple ATS) signed by Local Root CA
SERVER_KEY="$CERT_DIR/server.key"
SERVER_CSR="$CERT_DIR/server.csr"
SERVER_CRT="$CERT_DIR/server.crt"
EXT_CFG="$(mktemp)"
cat > "$EXT_CFG" <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
IP.2 = $LAN_IP
EOF

openssl ecparam -name prime256v1 -genkey -noout -out "$SERVER_KEY"
openssl req -new -key "$SERVER_KEY" -subj "/CN=$LAN_IP/O=LabRec Manager" -out "$SERVER_CSR"
openssl x509 -req -in "$SERVER_CSR" -CA "$CA_CRT" -CAkey "$CA_KEY" -CAcreateserial \
  -out "$SERVER_CRT" -days 365 -sha256 -extfile "$EXT_CFG"
rm -f "$EXT_CFG" "$SERVER_CSR"

# Apple Configuration Profile (.mobileconfig) so iPad/iOS can trust the Root CA in 2 taps
CA_B64="$(base64 < "$CA_CER" | tr -d '\n' | fold -w 76)"
MOBILECONFIG="$CERT_DIR/LabRec-RootCA.mobileconfig"
cat > "$MOBILECONFIG" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadCertificateFileName</key>
      <string>labrec-rootCA.cer</string>
      <key>PayloadContent</key>
      <data>
$CA_B64
      </data>
      <key>PayloadDescription</key>
      <string>Trusts the local LabRec Manager HTTPS Root CA for camera, microphone, and whiteboard sync.</string>
      <key>PayloadDisplayName</key>
      <string>LabRec Manager Local Root CA</string>
      <key>PayloadIdentifier</key>
      <string>com.labrecmanager.rootca.cert</string>
      <key>PayloadType</key>
      <string>com.apple.security.root</string>
      <key>PayloadUUID</key>
      <string>7C9D1B30-4B61-4E5A-B87E-112233445566</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Installs LabRec Manager Local Root CA certificate for trusted LAN HTTPS access.</string>
  <key>PayloadDisplayName</key>
  <string>LabRec Manager Local HTTPS CA</string>
  <key>PayloadIdentifier</key>
  <string>com.labrecmanager.rootca.profile</string>
  <key>PayloadOrganization</key>
  <string>LabRec Manager</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>A1B2C3D4-5E6F-47A8-9B0C-1234567890AB</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
EOF

echo "Generated certificates in $CERT_DIR:"
ls -lh "$CERT_DIR" "$CA_CER"
