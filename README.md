# batchRename
**A lean Node.js script for batch file renaming based on number sequencing, date properties, or regex patterns with rollback support.**


## How to run
Clone the repo, then run `npm install`.
Afterwards, the script can be used in one of the following ways:
- Inside the project folder:
  - Run `npm run dev` to transpile TypeScript to JavaScript
  - Run `node dist/index.js` with appropriate options.
- As a standalone script:
  - Run `npm run build` or `npx webpack` which will bundle the application into a single standalone bundle in the `prod` folder, called `batchRename.js`

## Examples | Quick start
Rename files in a target folder using a search and replace algorithm.

`node batchRename.js -s [regex|string] [replaceText] -f [filePath]`

Append creation date to files in the current folder and specify a custom separator.

`node batchRename.js -d --separator _`

Preview the odd numbering transform with custom text append in a target folder.

`node batchRename.js -n odd -f [targetFolder] -c CUSTOM_TEXT --textPosition append -D`

Rollback | restore to original file names in target folder.

`node batchRename.js -r -f [targetFolder]`



## Usage guide
To run the script successfully, you will have to provide one of the valid transform types (`numericTransform, searchAndReplace, dateTransform`), together with other optional arguments. Running script with no argument will show the help menu and exit.

When performing the rename operation, the script will write a restore file (`.rollback.json`) to the target folder. Without this file, restore operations are not possible. 

Before performing the rename, it is **strongly encouraged to perform a dry run first.**

The script will not perform a rename if it would lead to name collisions (i.e. several files sharing the same name). 

|Flag|Arguments|Description|
|------|-----------|--------|
|`-n, -numericTransform`|`sequential \| even \| odd`|Rename files by using either a sequence (n+1), even (2n), or odd (2n+1) numbering algorithm. Defaults to `sequence`. To help with file-sorting, the number of digits will always be one more than the (so, a list of 10 files will use three digits: 001, 002 ...) |
|`-d --dateRename`|`creationDate, lastAccessed, lastModifies`| Use date-related file information to rename a file. Defaults to `creationDate`. Can be used together wit the `--detailedDate` flag to add time information.|
|`-s, --searchAndReplace`|`<filter> <replacer>`|Takes a string|regex filter argument and a replacer string. In contrast to other two types, this transformations works on the entire file name, including the extension.|
|`-f, --folderPath`|`<path>`|Folder in which the transformation should take place. If omitted, it will default to current working directory.|
|`r, --restore`||Restore transformed files to original names, if restore file is available.|
|`-D, --dryRun`||Run transform operation without writing to disk. Expected output will be logged to console.|
|`-p, --preserveOriginal`|`boolean`| Preserve original file name. Not relevant for the `searchAndReplace` transform type. Defaults to `true`.|
|`-c, --customText`|`string`|Text to add to the transformed name. Overwrites the `preserveOriginal` flag.|
|`--textPosition`|`prepend \| append`|Applies to `preserveOriginal` or `customText`. Specifies where original or custom text should be appended with respect to the transformation text. Defaults to `append`|
|`--detailedDate`||Appends time information (`T hh:mm:ss`) to date transformations.|
|`--separator`|`character`|Specify a custom character which will be used as a separator in the dateTransformation and between the original|custom text and the transform text. Defaults to hyphen (`-`).|
|`--cleanRollback`||Remove rollback file.|
|`-h, --help`||Show help.|
|`-V, --version`||ShowScript version.|


<br>
<br>

<b>CAUTION | DISCLAIMER:</b>
<div style="font-size: 0.8rem">

Performing renaming operations on files is not without risks. Things can go wrong, errors can happen, rollbacks might not succeed, data might be lost. So remember: 
* Perform renaming operations only on files that you are prepared to lose or have backed up. 
* Before performing the rename, always do a dry-run.
* This script doesn't give you any guarantees or warranties about anything. 
</div>