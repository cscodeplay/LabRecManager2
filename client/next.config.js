const { execSync } = require('child_process');

let commitHash = 'dev';
let commitTime = '';
try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    commitTime = execSync('git show -s --format=%ci HEAD').toString().trim();
} catch (e) {
    // fallback if git not available (e.g. Docker)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    transpilePackages: ['lucide-react'],
    env: {
        NEXT_PUBLIC_COMMIT_HASH: commitHash,
        NEXT_PUBLIC_COMMIT_TIME: commitTime,
    },
    images: {
        domains: ['localhost'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.onrender.com',
            },
        ],
    },
    async rewrites() {
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/$/, '');
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/api/:path*`,
            },
            {
                source: '/socket.io/:path*',
                destination: `${apiUrl}/socket.io/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
