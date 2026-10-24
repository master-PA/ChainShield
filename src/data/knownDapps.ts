export interface KnownDapp {
  id: string;
  name: string;
  domain: string;
  category: 'dex' | 'nft' | 'lending' | 'staking' | 'wallet' | 'bridge';
  verifiedContracts: string[];
  perceptualHash: string; // 64-bit hex representation
}

export const KNOWN_DAPPS: KnownDapp[] = [
  {
    id: 'opensea',
    name: 'OpenSea',
    domain: 'opensea.io',
    category: 'nft',
    verifiedContracts: [
      '0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC', // Seaport 1.5
      '0x1E0049783F008A0085193E00003D00cd54003c71', // OpenSea Conduit
    ],
    perceptualHash: 'e3c0f0f0c0c0e0e0',
  },
  {
    id: 'uniswap',
    name: 'Uniswap',
    domain: 'app.uniswap.org',
    category: 'dex',
    verifiedContracts: [
      '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', // Universal Router
      '0x000000000022D473030F116dDEE9F6B43aC78BA3', // Permit2
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', // SwapRouter02
    ],
    perceptualHash: 'c7c3838383c3e7ff',
  },
  {
    id: 'blur',
    name: 'Blur',
    domain: 'blur.io',
    category: 'nft',
    verifiedContracts: [
      '0x000000000000Ad05Ccc4F10045630fb83919514D', // Blur Pool
      '0x39da41fe37d79f259935564a022a30f7b5d1df14', // Blur Exchange
    ],
    perceptualHash: 'a1a1b3b3f0f0e0e0',
  },
  {
    id: 'aave',
    name: 'Aave V3',
    domain: 'app.aave.com',
    category: 'lending',
    verifiedContracts: [
      '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2', // Aave V3 Pool
    ],
    perceptualHash: '8f8f0f0f1f1f3f3f',
  },
  {
    id: 'lido',
    name: 'Lido',
    domain: 'stake.lido.fi',
    category: 'staking',
    verifiedContracts: [
      '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', // stETH
    ],
    perceptualHash: '0f1f3f7f7f3f1f0f',
  },
  {
    id: 'curve',
    name: 'Curve Finance',
    domain: 'curve.fi',
    category: 'dex',
    verifiedContracts: [
      '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7', // 3pool
    ],
    perceptualHash: 'e0e0f0f0f8f8fcfe',
  },
  {
    id: 'metamask',
    name: 'MetaMask Portfolio',
    domain: 'portfolio.metamask.io',
    category: 'wallet',
    verifiedContracts: [],
    perceptualHash: 'fffe00000000feff',
  },
];
