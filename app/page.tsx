import { DrawCaptcha } from "./draw-captcha/DrawCaptcha";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
      <DrawCaptcha />
    </main>
  );
}
