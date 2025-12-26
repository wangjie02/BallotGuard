import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'BallotGuard',
  projectId: 'b1917f55f3c6b8e9fcd69f9d1a6f0cba',
  chains: [sepolia],
  ssr: false,
});
