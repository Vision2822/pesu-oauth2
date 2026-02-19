import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const generalLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 h"),
  prefix: "rl:general",
});

export const loginLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:login",
});

export const tokenLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "rl:token",
});

export const apiLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 d"),
  prefix: "rl:api",
});