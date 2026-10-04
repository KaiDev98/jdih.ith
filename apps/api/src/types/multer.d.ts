declare module 'multer' {
  type StorageEngine = object;
  interface DiskStorageOptions {
    destination: (request: Express.Request, file: Express.Multer.File, callback: (error: Error | null, path: string) => void) => void;
    filename: (request: Express.Request, file: Express.Multer.File, callback: (error: Error | null, name: string) => void) => void;
  }
  interface MulterOptions {
    storage?: StorageEngine;
    limits?: { fileSize?: number; files?: number; fields?: number; parts?: number };
  }
  interface MulterInstance {
    single(field: string): Express.RequestHandler;
  }
  function multer(options?: MulterOptions): MulterInstance;
  namespace multer {
    function diskStorage(options: DiskStorageOptions): StorageEngine;
  }
  export const diskStorage: typeof multer.diskStorage;
  export default multer;
}
