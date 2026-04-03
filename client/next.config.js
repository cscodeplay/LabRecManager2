const { execSync } = require('child_process');

let commitHash = 'dev';
try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
    // fallback if git not available (e.g. Docker)
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        NEXT_PUBLIC_COMMIT_HASH: commitHash,
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
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
