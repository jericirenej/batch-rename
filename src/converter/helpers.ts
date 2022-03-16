import { open } from "fs/promises";
import {join} from "path";
/**Create files for testing purposes */
export const generateFileList = async (
  length: number,
  baseName?: string
): Promise<void> => {
  const placeholderName = "someFile";

  const nameArray = new Array(length).fill(0).map((place, index) => {
    const sequenceNumber = index + 1;
    let stringifiedNum = sequenceNumber.toString();
    const diff = (10 * length).toString().length - stringifiedNum.length;

    const padding = new Array(diff).fill(0).join("");
    stringifiedNum = padding + stringifiedNum;
    const endPoint = `-${stringifiedNum}.ext`;
    const name = baseName
      ? `${baseName}${endPoint}`
      : `${placeholderName}${endPoint}`;
    return join(process.cwd(), name);
  });
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

(async () => await generateFileList(32))();
