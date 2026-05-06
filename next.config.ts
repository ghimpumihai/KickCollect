import type { NextConfig } from "next";
import { hostname as getHostname, networkInterfaces } from "node:os";

function getAllowedDevOrigins(): string[] {
  const configuredOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const interfaceOrigins = Object.values(networkInterfaces())
    .flatMap((details) => details ?? [])
    .filter((details) => !details.internal)
    .map((details) => details.address.split("%")[0])
    .filter((origin, index, origins) => origin.length > 0 && origins.indexOf(origin) === index);

  const hostname = getHostname().trim();
  const hostnameOrigins = hostname.length > 0 ? [hostname, `${hostname}.local`] : [];

  return Array.from(new Set([...configuredOrigins, ...hostnameOrigins, ...interfaceOrigins]));
}

const nextConfig: NextConfig = {
  // Next 16 blocks cross-origin dev assets by default. Allow the machine's LAN
  // hostnames and IPs so the app can hydrate when opened from another device.
  allowedDevOrigins: getAllowedDevOrigins(),
  turbopack: {
    root: __dirname,
  },
};
export default nextConfig;
