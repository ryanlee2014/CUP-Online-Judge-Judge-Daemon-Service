export default function TolerableAsync(target: any, propertyName: string, propertyDescriptor: PropertyDescriptor) {
  const method = propertyDescriptor.value as (...args: any) => Promise<any>;
  propertyDescriptor.value = async function (...args: any[]) {
    try {
      return await method.apply(this, args);
    }
    catch (e) {
      console.warn(`${target.constructor.name}.${propertyName} failed.`);
      console.warn(e);
    }
  }
}
