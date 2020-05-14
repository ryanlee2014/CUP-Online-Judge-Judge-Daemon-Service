import AwaitLock from "await-lock";

export default function ConcurrentLock (target: any, propertyName: string, propertyDescriptor: PropertyDescriptor) {
  const method = propertyDescriptor.value;
  const lock = new AwaitLock();
  propertyDescriptor.value = async function (...args: any[]) {
    await lock.acquireAsync();
    const resp = await method.apply(this, args);
    lock.release();
    return resp;
  }
}
