/** @type {import('next').NextConfig} */
const nextConfig = {
	async rewrites() {
		return [
			{
				source: "/ingest/static/:path*",
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://us.i.posthog.com/:path*",
			},
		];
	},
	// This is required to support PostHog trailing slash API requests
	skipTrailingSlashRedirect: true,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "pub-bf33e0c213b5411c9c6cf09450dc90d5.r2.dev",
			},
		],
	},
};

export default nextConfig;