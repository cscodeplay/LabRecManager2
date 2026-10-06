const { execSync } = require('child_process');

let commitHash = 'dev';
let commitFullHash = '';
let commitTime = '';
let commitMessage = '';
let commitAuthor = '';
let commitBranch = '';

try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
    commitFullHash = execSync('git rev-parse HEAD').toString().trim();
    commitTime = execSync('git show -s --format=%ci HEAD').toString().trim();
    commitMessage = execSync('git show -s --format=%s HEAD').toString().trim();
    commitAuthor = execSync('git show -s --format=%an HEAD').toString().trim();
    commitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
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
        NEXT_PUBLIC_COMMIT_FULL_HASH: commitFullHash,
        NEXT_PUBLIC_COMMIT_TIME: commitTime,
        NEXT_PUBLIC_COMMIT_MESSAGE: commitMessage,
        NEXT_PUBLIC_COMMIT_AUTHOR: commitAuthor,
        NEXT_PUBLIC_COMMIT_BRANCH: commitBranch,
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
        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/api\/?$/, '').replace(/\/$/, '');
        return [
            {
                source: '/api/:path*',
                destination: `${apiUrl}/api/:path*`,
            },
            {
                source: '/socket.io/:path*',
                destination: `${apiUrl}/socket.io/:path*`,
            },
            {
                source: '/RAG/:path*',
                destination: `${apiUrl}/RAG/:path*`,
            },
            {
                source: '/uploads/audio/:path*',
                destination: '/documents/audio/:path*',
            },
            {
                source: '/uploads/:path*',
                destination: `${apiUrl}/uploads/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
