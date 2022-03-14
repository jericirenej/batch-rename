import { open } from "fs/promises";
import { openSync, closeSync } from "fs";
import path from "path";
/**Create files for testing purposes */
export const generateFileList = async (
  length: number,
  baseName?: string
): Promise<void> => {
  const placeholderName = "someFile";

  const nameArray = new Array(length)
    .fill(0)
    .map((place, index) => {
      const endPoint = `-${index+1}.ext`
      const name = baseName ? `${baseName}${endPoint}`: `${placeholderName}${endPoint}`;
      return path.join(process.cwd(), name);
    }

    );
  console.log(nameArray);
  const promiseTouch = nameArray.map((name) => touchFileAsync(name));
  await Promise.all(promiseTouch);
};

const touchFileAsync = async (pathName: string) => {
  try {
    const fd = await open(pathName, "w+");
    fd.close();
  } catch (err) {
    console.error(err);
  }
};

const touchFileSync = (pathName: string) => {
  closeSync(openSync(pathName, "w+"));
};

(async () => await generateFileList(32))();
// touchFileSync(path.resolve(process.cwd(), "somFile.ext"));
