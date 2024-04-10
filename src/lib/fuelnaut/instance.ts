import { type Account, type BigNumberish, type JsonAbi, bn } from 'fuels';
import type { IFuelnautLevel } from '~/src/config/fuelnautLevels';
import type { FuelnautAbi } from '~/src/fuelnaut-api';
import type { ContractIdInput } from '~/src/fuelnaut-api/contracts/FuelnautAbi';

import type { Vec } from '~/src/fuelnaut-api/contracts/common';
import { getConfigurables } from './configurables';
import { deployNewInstance } from './deploy';
import { getLevelContractFactory } from './factories';

export async function getNewInstance(
  level: IFuelnautLevel,
  contract: FuelnautAbi,
  wallet: Account,
  bytecode: string,
  abiJSON: JsonAbi,
) {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const thisWindow = window as any;
  const configurableConstants = getConfigurables(level.key);
  const newInstance = await deployNewInstance(
    wallet,
    bytecode,
    abiJSON,
    configurableConstants,
  );
  const instanceId: ContractIdInput = {
    value: newInstance.id.toB256(),
  };
  const factory = getLevelContractFactory(level.key);
  const levelContract = factory.connect(instanceId.value, wallet);

  // without this, the newly deployed contract instance may not be found
  await timeout(2000);

  if (level.hasConfigurables && configurableConstants) {
    console.log('HAS CONFIGURABLES');
    // hardcoded for testing
    const configurableInputs = buildConfigurables(
      1288,
      1,
    );
    const bytecodeBuffer = Buffer.from(bytecode, 'base64');
    const bytecodeInput: Vec<BigNumberish> = [...bytecodeBuffer];

    console.log('CALLING CREATE INSTANCE WITH CONFIGURABLES...');

    await contract.functions
      .create_instance_with_configurables(
        instanceId,
        level.index,
        bytecodeInput,
        configurableInputs,
      )
      .addContracts([levelContract])
      .txParams({ gasPrice: 1, gasLimit: 1_000_000 })
      .call();
  } else {
  await contract.functions
      .create_instance(instanceId, level.index)
      .addContracts([levelContract])
      .txParams({ gasPrice: 1, gasLimit: 1_000_000 })
      .call();
  }
  thisWindow.instance = newInstance;
  return newInstance;
}

// "configurables": [
//   {
//     "name": "PASSWORD",
//     "configurableType": {
//       "name": "",
//       "type": 1,
//       "typeArguments": null
//     },
//     "offset": 1288
//   }
// ]

function buildConfigurables(
  offset: BigNumberish,
  configValue: BigNumberish,
): Vec<[BigNumberish, Vec<BigNumberish>]> {
  const myConfigurables: Vec<[BigNumberish, Vec<BigNumberish>]> = [];
  const data: Vec<BigNumberish> = [];
  data.push(0, 0, 0, 0, 0, 0, 0, configValue);
  myConfigurables.push([offset, data]);

  return myConfigurables;
}


function timeout(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}