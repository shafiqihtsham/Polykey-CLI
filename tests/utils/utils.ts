import type { NodeId } from '@matrixai/polykey/dist/ids/types';
import type PolykeyAgent from '@matrixai/polykey/dist/PolykeyAgent';
import type { Host, Port } from '@matrixai/polykey/dist/network/types';
import type { NodeAddress } from '@matrixai/polykey/dist/nodes/types';
import { IdInternal } from '@matrixai/id';
import * as keysUtils from '@matrixai/polykey/dist/keys/utils';
import { promise } from '@matrixai/polykey/dist/utils/utils';

function generateRandomNodeId(): NodeId {
  const random = keysUtils.getRandomBytes(16).toString('hex');
  return IdInternal.fromString<NodeId>(random);
}

function testIf(condition: boolean) {
  return condition ? test : test.skip;
}

function describeIf(condition: boolean) {
  return condition ? describe : describe.skip;
}

function trackTimers() {
  const timerMap: Map<any, any> = new Map();
  const oldClearTimeout = globalThis.clearTimeout;
  const newClearTimeout = (...args) => {
    timerMap.delete(args[0]);
    // @ts-ignore: slight type mismatch
    oldClearTimeout(...args);
  };
  globalThis.clearTimeout = newClearTimeout;

  const oldSetTimeout = globalThis.setTimeout;
  const newSetTimeout = (handler: TimerHandler, timeout?: number) => {
    const prom = promise();
    const stack = Error();
    const newCallback = async (...args) => {
      // @ts-ignore: only expecting functions
      await handler(...args);
      prom.resolveP();
    };
    const result = oldSetTimeout(newCallback, timeout);
    timerMap.set(result, { timeout, stack });
    void prom.p.finally(() => {
      timerMap.delete(result);
    });
    return result;
  };
  // @ts-ignore: slight type mismatch
  globalThis.setTimeout = newSetTimeout;

  // Setting up interval
  const oldSetInterval = globalThis.setInterval;
  const newSetInterval = (...args) => {
    // @ts-ignore: slight type mismatch
    const result = oldSetInterval(...args);
    timerMap.set(result, { timeout: args[0], error: Error() });
    return result;
  };
  // @ts-ignore: slight type mismatch
  globalThis.setInterval = newSetInterval;

  const oldClearInterval = globalThis.clearInterval;
  const newClearInterval = (timer) => {
    timerMap.delete(timer);
    return oldClearInterval(timer);
  };
  // @ts-ignore: slight type mismatch
  globalThis.clearInterval = newClearInterval();

  return timerMap;
}

/**
 * Adds each node's details to the other
 */
async function nodesConnect(localNode: PolykeyAgent, remoteNode: PolykeyAgent) {
  // Add remote node's details to local node
  await localNode.nodeManager.setNode(remoteNode.keyRing.getNodeId(), {
    host: remoteNode.quicServerAgent.host as unknown as Host,
    port: remoteNode.quicServerAgent.port as unknown as Port,
  } as NodeAddress);
  // Add local node's details to remote node
  await remoteNode.nodeManager.setNode(localNode.keyRing.getNodeId(), {
    host: localNode.quicServerAgent.host as unknown as Host,
    port: localNode.quicServerAgent.port as unknown as Port,
  } as NodeAddress);
}

export { generateRandomNodeId, testIf, describeIf, trackTimers, nodesConnect };
