// @todo Remove if possible?
declare module '@ledgerhq/hw-app-eth/erc20' {
  import type { Buffer } from 'buffer';

  export interface TokenInfo {
    contractAddress: string;
    ticker: string;
    decimals: number;
    chainId: number;
    signature: Buffer;
    data: Buffer;
  }

  /**
   * Retrieve the token information for a given contract address, if any.
   *
   * @param {string} contract The contract address.
   * @return {TokenInfo | undefined} Token information or undefined if address wasn't found.
   */
  export function byContractAddressAndChainId(
    contract: string,
    chainId: number
  ): TokenInfo | undefined;
}
