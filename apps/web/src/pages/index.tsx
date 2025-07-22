import dynamic from 'next/dynamic';
import Head from 'next/head';

// Avoid SSR for Phaser
const Game = dynamic(() => import('@/game-wrapper'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>ハイスピードおつかいローグ</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      <main className="flex h-screen w-screen items-center justify-center bg-black">
        <Game />
      </main>
    </>
  );
}
