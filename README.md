This repo is used for showing PDFTron WebViewer samples in codesandbox. There's no need to clone this repo to access samples. You can get all of them by downloading the WebViewer package at https://www.pdftron.com/documentation/web/download/web/

# Updating the samples

As previously mentioned, the samples can be found in the WebViewer package. You can update the files in this repo with the files found there.

When updating the `lib` directory in this repo, delete all the files first and then extract/copy the new `lib` files from the latest release into the `lib` directory. This is to delete any deprecated packages/files (ex. legacy-ui) that may not be part of a certain release.

To update the samples, simple copy over the files from the latest release package and replace the existing ones. For example, copy `/samples/viewing/viewing` from the release package into `/samples/viewing/viewing` of the repo. Please double check the sample changes as certain tweaks may be necessary. This is often for the links to the files being loaded by the sample.

Since CodeSandbox has a limit of 10 MB, you will have to delete certain files to reduce the file size. Known files to delete are:

1. sample`.ES5`.js files - CodeSandbox doesn't support IE11 anyways
2. `/lib/core/legacyOffice`
3. `/lib/core/external/model-viewer-legacy-x.x.x.min.js`
