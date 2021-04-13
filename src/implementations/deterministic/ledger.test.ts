import { createTransportReplayer, RecordStore } from '@ledgerhq/hw-transport-mocker';
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid-noevents';
import TransportU2F from '@ledgerhq/hw-transport-u2f';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';

import { DEFAULT_ETH, LEDGER_LIVE_ETH } from '@dpaths';
import { LedgerWallet, LedgerWalletInstance } from '@implementations/deterministic/ledger';
import { getFullPath } from '@utils';

import { fSignedTokenTx, fSignedTx, fTransactionRequest } from '../../../.jest/__fixtures__';

// To record a test, use a Ledger device initialised with the mnemonic phrase "test test test test test test test test
// test test test ball," and use the following code:
//
// const recordStore = new RecordStore();
// const Transport = createTransportRecorder(TransportNodeHid, recordStore);
// const wallet = new LedgerWallet(await Transport.create());
//
// await expect(wallet.getAddress(DEFAULT_ETH, 0)).resolves.toBe('0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf');
// await expect(wallet.getAddress(DEFAULT_ETH, 1)).resolves.toBe('0x59A897A2dbd55D20bCC9B52d5eaA14E2859Dc467');
//
// console.log(recordStore.toString());

describe('LedgerWalletInstance', () => {
  describe('signTransaction', () => {
    it('signs a transaction', async () => {
      const store = RecordStore.fromString(`
        => e004000041058000002c8000003c800000000000000000000000eb0685012a05f20082520894b2bb2b958afa2e96dab3f3ce7162b87daea39017872386f26fc1000080038080
        <= 2975b96c4423ea79037099e0f8a0fa7d8538f00c6aaddea26e151320aac65ae3bd5266d81476adedc28c5e769f8bf016de33bdaa49f341435df429e01fe5f9b16e9000
      `);

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());
      const instance = await wallet.getWallet(DEFAULT_ETH, 0);

      await expect(instance.signTransaction(fTransactionRequest)).resolves.toBe(fSignedTx);
    });

    it('signs a transaction with token information', async () => {
      const store = RecordStore.fromString(`
        => e00a000066035a5258e41d2489571d322189246dafa5ebde1f4699f4980000001200000001304402200ae8634c22762a8ba41d2acb1e068dcce947337c6dd984f13b820d396176952302203306a49d8a6c35b11a61088e1570b3928ca3a0db6bd36f577b5ef87628561ff7
        <= 9000
        => e004000041058000002c8000003c800000000000000000000000eb0685012a05f20082520894e41d2489571d322189246dafa5ebde1f4699f498872386f26fc1000080018080
        <= 2686fdf8b0c4ba7e59b93f0a81a9d5083835caf56b17aac3fe251f276a10ef33d44ec0c25116937acdec4617182127d9f6a9431e837412babd150331d00d5e0ae99000
      `);

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());
      const instance = await wallet.getWallet(DEFAULT_ETH, 0);

      await expect(
        instance.signTransaction({
          ...fTransactionRequest,
          to: '0xe41d2489571d322189246dafa5ebde1f4699f498',
          chainId: 1
        })
      ).resolves.toBe(fSignedTokenTx);
    });

    it('throws on missing chain id', async () => {
      const store = new RecordStore();

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());
      const instance = await wallet.getWallet(DEFAULT_ETH, 0);

      await expect(() =>
        instance.signTransaction({ ...fTransactionRequest, chainId: undefined })
      ).rejects.toThrow('Missing chainId on transaction');
    });
  });

  describe('getAddress', () => {
    it('returns an address for the derivation path of the instance', async () => {
      const store = RecordStore.fromString(`
        => e002000015058000002c8000003c800000000000000000000000
        <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba6428633644356133633938454339303733423534464130393639393537426435383265384438373462669000
      `);

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());
      const instance = await wallet.getWallet(DEFAULT_ETH, 0);

      await expect(instance.getAddress()).resolves.toBe(
        '0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf'
      );
    });
  });

  describe('getPrivateKey', () => {
    it('throws an error', async () => {
      const store = new RecordStore();

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());
      const instance = await wallet.getWallet(DEFAULT_ETH, 0);

      await expect(() => instance.getPrivateKey()).rejects.toThrow('Method not implemented.');
    });
  });
});

describe('LedgerWallet', () => {
  describe('getAddress', () => {
    it('fetches an address from the device', async () => {
      const store = RecordStore.fromString(`
        => e002000015058000002c8000003c800000000000000000000000
        <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba6428633644356133633938454339303733423534464130393639393537426435383265384438373462669000
        => e002000015058000002c8000003c800000000000000000000001
        <= 4104b21938e18aec1e2e7478988ccae5b556597d771c8e46ac2c8ea2a4a1a80619679230a109cd30e8af15856b15799e38991e45e55f406a8a24d5605ba0757da53c28353941383937413264626435354432306243433942353264356561413134453238353944633436379000
      `);

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());

      await expect(wallet.getAddress(DEFAULT_ETH, 0)).resolves.toBe(
        '0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf'
      );
      await expect(wallet.getAddress(DEFAULT_ETH, 1)).resolves.toBe(
        '0x59A897A2dbd55D20bCC9B52d5eaA14E2859Dc467'
      );
    });
  });

  describe('getHardenedAddress', () => {
    it('fetches an address from the device on a hardened level', async () => {
      const store = RecordStore.fromString(`
        => e002000015058000002c8000003c800000000000000000000000
        <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba6428633644356133633938454339303733423534464130393639393537426435383265384438373462669000
        => e002000015058000002c8000003c800000010000000000000000
        <= 4104ecc55657c13ddfb60cd03a6787bfd524cc960570d7a84f987126f337c1c7cf0eeda2877ce13ee570bbe32ef47c603feb8acf63c4ff350e98f0251bdabfcf76dc28334645373033613230333543423335393043383635613039463535366544646130326232436631329000
      `);

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());

      await expect(wallet.getHardenedAddress(LEDGER_LIVE_ETH, 0)).resolves.toBe(
        '0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf'
      );
      await expect(wallet.getHardenedAddress(LEDGER_LIVE_ETH, 1)).resolves.toBe(
        '0x3FE703a2035CB3590C865a09F556eDda02b2Cf12'
      );
    });
  });

  describe('getAddresses', () => {
    it('fetches multiple addresses for a derivation path', async () => {
      const store = RecordStore.fromString(`
        => e002000111048000002c8000003c8000000000000000
        <= 41044d7509b2ddb7179364109b16ea95c8282ff05c6866ae760b22eca20b8e66dc9ab32d17a73231de3bbb46696084155f8a7f6be29408a70fc3103112cefccc4ce328333134393746343930323933434635613435343062383163394635393931304636323531396236337968ee36e0b6d94da4551bac811e7816115d4ebb9e15a6f4068bbc29736d45769000
        => e00200010d038000002c8000003c80000000
        <= 4104d54226ceac221f494aa1888252f47220e9d4cf0ddc11a651433bcad6364ee2af9862e1c78d56331267a95c660b182ea47e8dd0cedb231a2a1de59e8c3031bf222863643137353661664437334531663937423166393266334633614131303532456334374235333532f34046e410a060091825436065aa12e074c6c8f348e3528578e902777789d0b59000
      `);

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());

      await expect(wallet.getAddresses({ path: DEFAULT_ETH, limit: 5 })).resolves.toStrictEqual([
        {
          address: '0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf',
          dPath: "m/44'/60'/0'/0/0",
          index: 0
        },
        {
          address: '0x59A897A2dbd55D20bCC9B52d5eaA14E2859Dc467',
          dPath: "m/44'/60'/0'/0/1",
          index: 1
        },
        {
          address: '0x7D5e716Bbc8771af9c5ec3b0555B48a4a84d4ba7',
          dPath: "m/44'/60'/0'/0/2",
          index: 2
        },
        {
          address: '0x8137eC5954A8ed45A90F3bd58f717228b5670858',
          dPath: "m/44'/60'/0'/0/3",
          index: 3
        },
        {
          address: '0xc0C386F7f0B02FAC0d63B2de00a01e77992B011B',
          dPath: "m/44'/60'/0'/0/4",
          index: 4
        }
      ]);
    });

    it('fetches multiple addresses for a hardened derivation path', async () => {
      const store = RecordStore.fromString(`
        => e002000015058000002c8000003c800000000000000000000000
        <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba6428633644356133633938454339303733423534464130393639393537426435383265384438373462669000
        => e002000015058000002c8000003c800000010000000000000000
        <= 4104ecc55657c13ddfb60cd03a6787bfd524cc960570d7a84f987126f337c1c7cf0eeda2877ce13ee570bbe32ef47c603feb8acf63c4ff350e98f0251bdabfcf76dc28334645373033613230333543423335393043383635613039463535366544646130326232436631329000
        => e002000015058000002c8000003c800000020000000000000000
        <= 4104a88fc1f397adf7f335401343f74ed36b82b9bd2d4080880fe83af074547c61c664ee7bf1c17054be3a3d30d777d66cb502a83e56a2fff9cc4bbab529f0c9a19928323135396134313443344163303830343832434536463934326363354243353933303661314134379000
        => e002000015058000002c8000003c800000030000000000000000
        <= 4104fd234593caaafd164e8d6d4f5f3ce2c37af8e3919b0f3d2eb2dd454313fe5da10aec9d12cebec71ddda1bfc1cde734cba7658ca9f89ebeeba41eccf2d7fae5ea28426465633334343831383239633233393646413135624163353232374430423035634633446334319000
        => e002000015058000002c8000003c800000040000000000000000
        <= 410474c0c80b86d0d50da9607401c43420928f2feb829b6c3e569a6fabbf5bba9a17903666aca0fd26c541bbeeae6ac2271848e3739db35fd926eab5a535b8c8387528393165323833314135324534656545326566613842303542306244304339333034303734393544439000
      `);

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());

      await expect(wallet.getAddresses({ path: LEDGER_LIVE_ETH, limit: 5 })).resolves.toStrictEqual(
        [
          {
            address: '0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf',
            dPath: "m/44'/60'/0'/0/0",
            index: 0
          },
          {
            address: '0x3FE703a2035CB3590C865a09F556eDda02b2Cf12',
            dPath: "m/44'/60'/1'/0/0",
            index: 1
          },
          {
            address: '0x2159a414C4Ac080482CE6F942cc5BC59306a1A47',
            dPath: "m/44'/60'/2'/0/0",
            index: 2
          },
          {
            address: '0xBdec34481829c2396FA15bAc5227D0B05cF3Dc41',
            dPath: "m/44'/60'/3'/0/0",
            index: 3
          },
          {
            address: '0x91e2831A52E4eeE2efa8B05B0bD0C930407495DC',
            dPath: "m/44'/60'/4'/0/0",
            index: 4
          }
        ]
      );
    });
  });

  describe('getExtendedKey', () => {
    it('fetches a public key and chaincode from the device', async () => {
      const store = RecordStore.fromString(`
        => e002000115058000002c8000003c800000000000000000000000
        <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba642863364435613363393845433930373342353446413039363939353742643538326538443837346266968a2e8e9aa80d3c3416b33e3d912b6a919af9909f42d29d2eb0b8f28ea4dcfd9000
        => e002000115058000002c8000003c800000000000000000000001
        <= 4104b21938e18aec1e2e7478988ccae5b556597d771c8e46ac2c8ea2a4a1a80619679230a109cd30e8af15856b15799e38991e45e55f406a8a24d5605ba0757da53c28353941383937413264626435354432306243433942353264356561413134453238353944633436376265b647bc0e70480f29856be102fe866ea6a8ec9e2926c198c2e9c4cd268a439000
      `);

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());

      await expect(wallet.getExtendedKey(getFullPath(DEFAULT_ETH, 0))).resolves.toStrictEqual({
        chainCode: '968a2e8e9aa80d3c3416b33e3d912b6a919af9909f42d29d2eb0b8f28ea4dcfd',
        publicKey:
          '04b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba64'
      });
      await expect(wallet.getExtendedKey(getFullPath(DEFAULT_ETH, 1))).resolves.toStrictEqual({
        chainCode: '6265b647bc0e70480f29856be102fe866ea6a8ec9e2926c198c2e9c4cd268a43',
        publicKey:
          '04b21938e18aec1e2e7478988ccae5b556597d771c8e46ac2c8ea2a4a1a80619679230a109cd30e8af15856b15799e38991e45e55f406a8a24d5605ba0757da53c'
      });
    });
  });

  describe('getWallet', () => {
    it('returns an instance of a Ledger wallet at a specific derivation path', async () => {
      const store = RecordStore.fromString(`
        => e002000015058000002c8000003c800000000000000000000000
        <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba6428633644356133633938454339303733423534464130393639393537426435383265384438373462669000
      `);

      const transport = createTransportReplayer(store);
      const wallet = new LedgerWallet(await transport.create());

      const instance = await wallet.getWallet(DEFAULT_ETH, 0);

      expect(instance).toBeInstanceOf(LedgerWalletInstance);
      expect(await instance.getAddress()).toBe('0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf');
    });
  });

  describe('getTransport', () => {
    it('uses TransportNodeHid when available', async () => {
      const store = RecordStore.fromString(`
      => e002000015058000002c8000003c800000000000000000000000
      <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba6428633644356133633938454339303733423534464130393639393537426435383265384438373462669000
    `);

      const transport = createTransportReplayer(store);
      TransportNodeHid.isSupported = jest.fn().mockReturnValueOnce(true);
      TransportNodeHid.create = jest.fn().mockImplementation(() => transport.create());
      const wallet = await new LedgerWallet().getWallet(DEFAULT_ETH, 0);
      expect(await wallet.getAddress()).toBe('0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf');
      expect(TransportNodeHid.create).toHaveBeenCalled();
    });

    it('uses TransportWebHID when available', async () => {
      const store = RecordStore.fromString(`
      => e002000015058000002c8000003c800000000000000000000000
      <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba6428633644356133633938454339303733423534464130393639393537426435383265384438373462669000
    `);

      const transport = createTransportReplayer(store);
      TransportWebHID.isSupported = jest.fn().mockReturnValueOnce(true);
      TransportWebHID.create = jest.fn().mockImplementation(() => transport.create());
      const wallet = await new LedgerWallet().getWallet(DEFAULT_ETH, 0);
      expect(await wallet.getAddress()).toBe('0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf');
      expect(TransportWebHID.create).toHaveBeenCalled();
    });

    it('uses TransportWebUSB when available', async () => {
      const store = RecordStore.fromString(`
      => e002000015058000002c8000003c800000000000000000000000
      <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba6428633644356133633938454339303733423534464130393639393537426435383265384438373462669000
    `);

      const transport = createTransportReplayer(store);
      TransportWebUSB.isSupported = jest.fn().mockReturnValueOnce(true);
      TransportWebUSB.create = jest.fn().mockImplementation(() => transport.create());
      const wallet = await new LedgerWallet().getWallet(DEFAULT_ETH, 0);
      expect(await wallet.getAddress()).toBe('0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf');
      expect(TransportWebUSB.create).toHaveBeenCalled();
    });

    it('uses TransportU2F when available', async () => {
      const store = RecordStore.fromString(`
      => e002000015058000002c8000003c800000000000000000000000
      <= 4104b884d0c53b60fb8aafba20ca84870f20428082863f1d39a402c36c2de356cb0c6c0a582f54ee29911ca6f1823d34405623f4a7418db8ebb0203bc3acba08ba6428633644356133633938454339303733423534464130393639393537426435383265384438373462669000
    `);

      const transport = createTransportReplayer(store);
      TransportU2F.isSupported = jest.fn().mockReturnValueOnce(true);
      TransportU2F.create = jest.fn().mockImplementation(() => transport.create());
      const wallet = await new LedgerWallet().getWallet(DEFAULT_ETH, 0);
      expect(await wallet.getAddress()).toBe('0xc6D5a3c98EC9073B54FA0969957Bd582e8D874bf');
      expect(TransportU2F.create).toHaveBeenCalled();
    });
  });
});