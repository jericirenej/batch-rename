# batchRename
**A lean, no nonsense Node.js utility for batch file renaming with rollback support.**

<br>

## Main features
- **A variety of transform operations:** Search and replace variants, numeric and date transforms, truncate, add text and format transforms.
- **Flexible operation:** You can target files (default), directories, or both. Transforms can be directed at base names only (default), just extensions, or the whole name. Some transformations (in particular `addText, truncate, and format`) may be combined to produce a compound effect. 
- **Lightweight:** Compiled script comes in at just over 61 KB.
- **Results preview:** All transform operation run in `dryRun` mode by default so they can be previewed and executed only upon explicit confirmation.
  - The `cleanRollbackFile` utility option is a current exception: it will run immediately, without confirm prompt.
- **Multi level rollback:** By default, each transform operation will create or update a rollback file in the target directory with a history of all transforms. This means multiple transforms on existing / newly added files can be made and rolled back. 
  - The rollback logic also gracefully handles failed restore operations (for example, because of file locks), by re-adding them to the rollback file as the most recent transformation available for restore.
- **Safety features:** In addition to the built-in rollback functionality, the script also strives to prevent duplicate transforms that would result in file overwrites from happening.


## How to run
- **Preferred**: Download the production version of the script in the [Releases subpage](https://github.com/jericirenej/batch-rename/releases). Then run `node /path-to-your-file/batchRename.mjs` with the appropriate option.
Clone the repo, then run `npm install`. Afterwards, you can either:
- Run the script inside the project folder by executing `npm run compile` and `node dist/index.js` with appropriate options. Alternatively, you can also transpile the code directly via `npx ts-node src/index.ts`.
- As a standalone script: Execute `npm run build` or `npx webpack` which will bundle the application into a single standalone bundle in the `prod` folder, called `batchRename.mjs` 

## Examples | Quick start
Rename files using a search and replace algorithm. Target folder set explicitly.

`node batchRename.mjs -s [regex|string] [replaceText] --target [folder]`

Preview rename files by keeping only part of the name (the 'id-' tag with variable number of digits).

`node batchRename.mjs -k 'id-\d{1,}' --target [folder]`

Preview numeric transform with exclude option and a custom baseIndex. Folder path set implicitly.

`node batchRename.mjs -n --exclude 'excludedName' -b 100 'folder'`

Append creation date to files AND folders in the current folder and specify a custom separator.

`node batchRename.mjs -d --separator _ --targetType all`

Preview the odd numbering transform with custom text append in a target folder.

`node batchRename.mjs -n odd -t [targetFolder] -a CUSTOM_TEXT --textPosition append`

Rollback | restore to original file names in target folder.

`node batchRename.mjs -r --target [targetFolder]`

Truncate files to 10 characters and change all characters to upper case

`node batchRename.mjs -t 10 -f uppercase`

Change extension of all files, except excluded.

`node batchRename.mjs -e 'png' --exclude 'someFilePattern'`


## Usage guide
- One of the valid transform types must be provided (`numericTransform, searchAndReplace, dateTransform, keep, omit, truncate, format, addText`), together with other optional arguments. 
- Alternatively, a rollback operation may be perform by supplying the appropriate option.
- Running script with no arguments will show the help menu and exit.

When performing the rename operation, the script will write a restore file (`.rollback.json`) to the target folder (except if `--skipRollback` flag is set). Without this file, restore operations are not possible. 

Dry run is enabled by default. This means that planned changes will be displayed and executed only after explicitly confirming them. It is **strongly encouraged not to disable the dry run mode.** 

The script will not perform a rename if it would lead to name collisions (i.e. several files sharing the same name).

### Options overview

|Flag|Arguments|Description|
|------|-----------|--------|
|`-n, -numericTransform`|`[sequential \| even \| odd]`|Rename files by using either a sequence (n+1), even (2n), or odd (2n+1) numbering algorithm. Defaults to `sequence`. To help with file-sorting, the number of digits will always be one more than the number taken up by the total count of target files (a list of 10 files is represented by two digits - therefore, three digits will be used: 001, 002 ...). |
|`-d --dateRename`|`<creationDate, lastAccessed, lastModified>`| Use date-related file information to rename a file. Defaults to `creationDate`. Can be used together wit the `--detailedDate` flag to add time information.|
|`-s, --searchAndReplace`|`<string\|regex> <replacer>`|Takes a string or a regex filter argument and a replacer string. By default, the transform will preserve file extensions, unless a `--noPreserveExtension` option is supplied.|
|`-k --keep`|`<regex\|string>`|Will remove everything, except the matched part of the name. Essentially the same as replacing positive look-behind and look-ahead captures and with empty strings. Can be used together with addText, textPosition, format, noExtensionPreserve, and separator flags.|
|`-o --omit`|`<regex\|string>`|Will remove all matched parts of the name. Can be used together with addText, textPosition, format, noExtensionPreserve, and separator flags.|
|`-t, --truncate`|`<number>`|Truncate the baseName. Can be used in combination with other transform types or on its own. If used on its own, and preserveOriginal is false, it has no effect.|
|`-f, --format`|`[uppercase \| lowercase \| capitalize]`|Perform one of the specified transformations on the final rename. Can be used in conjunction with other transforms (except extensionModify).|
|`-a, --addText`|`<string>`|Text to add to the target filename. Can be used on its own, together with 'textPosition' flag, or in combination with other transform types. Overwrites the `preserveOriginal` flag.|
|`-e, --extensionModify`|`<string>`|Modify extension of target files. Can also be used together with the exclude option.|
|`--target`|`<path>`|Folder in which the transformation should take place. *Can also be set implicitly* with an extra script argument (explicit setting takes precedence). If omitted, the script defaults to current working directory.|
|`--targetType`|`['files'\|'dirs'\|'all']`|Determine which file types should be included in transform. Defaults to 'files' if omitted or supplied without option.|
|`-r, --restore`|`[number]`|Restore transformed files to target rollback level. If no level is provided, maximum restore level will be used.|
|`-D, --dryRun`|`<boolean>`|Log expected output and write only after confirmation. Defaults to true.|
|`-b, --baseIndex`|`<number>`|For numeric transform, optional argument to specify the base index from which the sequencing will begin.|
|`--exclude`|`<string\|regex>`|Preemptively exclude files that match a given string or regular expression from being evaluated in the transform functions|
|`-p, --preserveOriginal`|`[boolean]`| Preserve original file name. Not relevant for the `searchAndReplace` transform type. Defaults to `true`.|
|`--noExtensionPreserve`||An option for the `searchAndReplace` and `format` transforms which includes the file extension in the transform operation.|
|`--textPosition`|`[prepend \| append]`|Applies to `preserveOriginal` or `addText`. Specifies where original or custom text should be appended with respect to the transformation text. Defaults to `append`.|
|`--detailedDate`||Appends time information (`T hh:mm:ss`) to date transformations.|
|`--separator`|`<character>`|Specify a custom character which will be used as a separator the original \| custom text and the transform text. Can be an empty string (in this case it will be ignored in date formatting). Defaults to hyphen (`-`).|
|`--skipRollback`|`[boolean]`|Skip writing transform details to rollback file. Defaults to true, if omitted.|
|`--cleanRollback`|`[boolean]`|Remove rollback file.|
|`-h, --help`||Show help.|
|`-V, --version`||Output the version number.|


<br>
<br>

<b>CAUTION | DISCLAIMER:</b>
<div style="font-size: 0.8rem">

Performing renaming operations on files is not without risks. Things can go wrong, errors can happen, rollbacks might not succeed, data might be lost. So remember: 
* Perform renaming operations only on files that you are prepared to lose or have backed up. 
* Default dry runs are enabled for a reason.
* This script doesn't give you any guarantees or warranties about anything. 
</div>