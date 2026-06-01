import { generateKeyPairSync } from "node:crypto";

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const publicJwk = publicKey.export({ format: "jwk" });
const privateJwk = privateKey.export({ format: "jwk" });
const publicBytes = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(publicJwk.x, "base64url"),
  Buffer.from(publicJwk.y, "base64url")
]);

const vapidPublicKey = base64Url(publicBytes);
const vapidPrivateKey = privateJwk.d;

console.log("Copy these into Render Environment Variables:");
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidPublicKey}`);
console.log(`VAPID_PUBLIC_KEY=${vapidPublicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidPrivateKey}`);
console.log("VAPID_SUBJECT=mailto:you@example.com");
