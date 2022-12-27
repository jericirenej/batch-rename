# batchRename
**A lean Node.js script for batch file renaming based on number sequencing, date properties, or regex patterns with rollback support.**

<br>

## New features
- **Multi level rollback** is now implemented. Each rollback file now stores a history of all the transforms performed. This means you can perform multiple transformation on existing / newly added files, then restore back to previous file names by discrete levels. 
  - Just add the number of rollbacks you wish to perform next to the `restore` flag. Or omit the argument to roll back to the beginning!
  - Implementing the rollback feature meant a complete rewrite of the rollback logic. However, previous (legacy) rollback files are still supported and will be converted to the current format automatically.
  - **Handling of failed restores**: If a restore operation fails on write (for example, because the file is locked by the OS), the failed restore files will be re-added to the rollback file as the most recent transformation so that the changes are not discarded. 
- **Convert and restore operations run in dryRun by default** so that changes can be previewed and executed via explicit confirmation. 
  - The `cleanRollbackFile` is an exception currently: it will run immediately, without confirm prompt.
- **Ability to skip writing rollback file** on transform operations: by using the `skipRollback` option.
- **Ensure alphabetical sorting of read files and directories**: Ascending alphabetical sorting. Directories placed before files.
- Various bug fixes. Test improvements, mock files consolidation.

- Despite best efforts and improved tests for the new features, some **buggy behavior can occur**.


## How to run
Clone the repo, then run `npm install`.
Afterwards, the script can be used in one of the following ways:
- Inside the project folder:
  - Run `npm run dev` to transpile TypeScript to JavaScript
  - Run `node dist/index.js` with appropriate options.
- As a standalone script:
  - Run `npm run build` or `npx webpack` which will bundle the application into a single standalone bundle in the `prod` folder, called `batchRename.mjs`

## Examples | Quick start
Rename files using a search and replace algorithm. Target folder set explicitly.

`node batchRename.mjs -s [regex|string] [replaceText] --target [folder]`

Preview rename files by keeping only part of the name (the 'id-' tag with variable number of digits).

`node batchRename.mjs -k "id-\d{1,}" --target [folder]`

Preview numeric transform with exclude option and a custom baseIndex. Folder path set implicitly.

`node batchRename.mjs -n --exclude "excludedName" -b 100 "folder"`

Append creation date to files AND folders in the current folder and specify a custom separator.

`node batchRename.mjs -d --separator _ --targetType all`

Preview the odd numbering transform with custom text append in a target folder.

`node batchRename.mjs -n odd -f [targetFolder] -a CUSTOM_TEXT --textPosition append`

Rollback | restore to original file names in target folder.

`node batchRename.mjs -r --target [targetFolder]`

Truncate files to 10 characters and change all characters to upper case

`node batchRename.mjs -t 10 -f uppercase`

Change extension of all files, except excluded.

`node batchRename.mjs -e "png" --exclude "someFilePattern"`


## Usage guide
To run the script successfully, you will have to provide one of the valid transform types (`numericTransform, searchAndReplace, dateTransform`), together with other optional arguments. Running script with no argument will show the help menu and exit.

When performing the rename operation, the script will write a restore file (`.rollback.json`) to the target folder. Without this file, restore operations are not possible. 

Dry run is enabled by default. This means that you will see planned changes and these will be executed only after explicitly confirming them. It is **strongly encouraged not to disable the dry run mode.** 

The script will not perform a rename if it would lead to name collisions (i.e. several files sharing the same name).

|Flag|Arguments|Description|
|------|-----------|--------|
|`-n, -numericTransform`|`[sequential \| even \| odd]`|Rename files by using either a sequence (n+1), even (2n), or odd (2n+1) numbering algorithm. Defaults to `sequence`. To help with file-sorting, the number of digits will always be one more than the (so, a list of 10 files will use three digits: 001, 002 ...) |
|`-d --dateRename`|`<creationDate, lastAccessed, lastModifies>`| Use date-related file information to rename a file. Defaults to `creationDate`. Can be used together wit the `--detailedDate` flag to add time information.|
|`-s, --searchAndReplace`|`<string\|regex> <replacer>`|Takes a string or a regex filter argument and a replacer string. By default, the transform will preserve file extensions, unless a `--noPreserveExtension` option is supplied|
|`-k --keep`|`<regex\|string>`|Will remove everything, except the matched part of the name. Essentially the same as replacing positive look-behinds and look-aheads captures and with empty strings. Can be used together with addText, textPosition, format, noExtensionPreserve, and separator flags.|
|`-t, --truncate`|`<number>`|Truncate the baseName. Can be used in combination with other transform types or on its own. If preserveOriginal is false or addText is supplied, it has no effect.|
|`-f, --format`|`[uppercase \| lowercase \| capitalize]`|Perform one of the specified transformations on the final rename. Can be used in conjunction with other transforms (except extensionModify).|
|`-e, --extensionModify`|`<string>`|Modify extension of target files. Can also be used together with the exclude option|
|`-a, --addText`|`<string>`|Text to add to the target filename. Can be used on its own, together with 'textPosition' flag, or in combination with other transform types. Overwrites the `preserveOriginal` flag.|
|`--target`|`<path>`|Folder in which the transformation should take place. *Can also be set implicitly* with an extra script argument (explicit setting takes precedence). If omitted, the script defaults to current working directory.|
|`--targetType`|`['files'\|'dirs'\|'all']`|Determine which file types should be included in transform. Defaults to 'files' If omitted or supplied without option.|
|`-r, --restore`|`[number]`|Restore transformed files to target rollback level. If no level is provided, maximum restore level will be used.|
|`-D, --dryRun`|`<boolean>`|Log expected output and write only after confirmation. Defaults to true.|
|`-b, --baseIndex`|`<number>`|For numeric transform, optional argument to specify the base index from which the sequencing will begin|
|`--exclude`|`<string\|regex>`|Preemptively exclude files that match a given string or regular expression from being evaluated in the transform functions|
|`-p, --preserveOriginal`|`[boolean]`| Preserve original file name. Not relevant for the `searchAndReplace` transform type. Defaults to `true`.|
|`--noExtensionPreserve`||An option for the 'searchAndPreserve' and 'format' transforms which includes the file extension in the transform operation.|
|`--textPosition`|`[prepend \| append]`|Applies to `preserveOriginal` or `addText`. Specifies where original or custom text should be appended with respect to the transformation text. Defaults to `append`|
|`--detailedDate`||Appends time information (`T hh:mm:ss`) to date transformations.|
|`--separator`|`<character>`|Specify a custom character which will be used as a separator in the dateTransformation and between the original|custom text and the transform text. Can be an empty string (in this case it will be ignored in date formatting). Defaults to hyphen (`-`).|
|`--skipRollback`|`[boolean]`|Skip writing transform details to rollback file. Defaults to true, if omitted.|
|`--cleanRollback`|`[boolean]`|Remove rollback file.|
|`-h, --help`||Show help.|
|`-V, --version`||ShowScript version.|


<br>
<br>

<b>CAUTION | DISCLAIMER:</b>
<div style="font-size: 0.8rem">

Performing renaming operations on files is not without risks. Things can go wrong, errors can happen, rollbacks might not succeed, data might be lost. So remember: 
* Perform renaming operations only on files that you are prepared to lose or have backed up. 
* Default dry runs are enabled for a reason.
* This script doesn't give you any guarantees or warranties about anything. 
</div>