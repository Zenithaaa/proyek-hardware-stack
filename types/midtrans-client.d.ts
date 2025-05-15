declare module "midtrans-client" {
  interface ClientOptions {
    isProduction?: boolean;
    serverKey: string;
    clientKey: string;
  }

  class Snap {
    constructor(options: ClientOptions);
    createTransaction(parameter: any): Promise<any>;
    createTransactionToken(parameter: any): Promise<string>;
    createTransactionRedirectUrl(parameter: any): Promise<string>;
  }

  class CoreApi {
    constructor(options: ClientOptions);
    charge(parameter: any): Promise<any>;
    capture(parameter: any): Promise<any>;
    cardToken(parameter: any): Promise<any>;
    cardRegister(parameter: any): Promise<any>;
    expire(transactionId: string): Promise<any>;
    status(transactionId: string): Promise<any>;
    statusb2b(transactionId: string): Promise<any>;
    approve(transactionId: string): Promise<any>;
    deny(transactionId: string): Promise<any>;
    cancel(transactionId: string): Promise<any>;
    refund(parameter: any): Promise<any>;
    directRefund(parameter: any): Promise<any>;
  }

  export { Snap, CoreApi };
  export default { Snap, CoreApi };
}
