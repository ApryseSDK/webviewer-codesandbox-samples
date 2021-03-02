(() => {
  const parentDocument = window.parent.document;
  const certSelect = parentDocument.getElementById('certificate-select');
  const certUrlForm = parentDocument.getElementById('certificate-url-form');
  const docSelect = parentDocument.getElementById('document-select');
  const docUrlForm = parentDocument.getElementById('document-url-form');
  const filePicker = parentDocument.getElementById('file-picker');

  window.addEventListener('viewerLoaded', () => {
    const instance = window.readerControl;

    const initialCert = 'https://pdftron.s3.amazonaws.com/downloads/pl/pdftron.cer';
    instance.verificationOptions.addTrustedCertificates([initialCert]);

    instance.docViewer.one('documentLoaded', () => {
      instance.openElements(['signaturePanel']);
    });

    certSelect.addEventListener('change', e => {
      instance.verificationOptions.addTrustedCertificates([e.target.value]);
    });

    certUrlForm.addEventListener('submit', e => {
      e.preventDefault();

      certSelect.value = '';

      const certUrl = document.getElementById('certificate-url');
      instance.verificationOptions.addTrustedCertificates([certUrl.value]);
    });

    docSelect.addEventListener('change', e => {
      instance.loadDocument(e.target.value);
    });

    docUrlForm.addEventListener('submit', e => {
      e.preventDefault();

      docSelect.value = '';

      const docUrl = document.getElementById('document-url');
      instance.loadDocument(docUrl.value);
    });

    filePicker.addEventListener('change', e => {
      const file = e.target.files[0];

      if (!file) {
        return;
      }

      const ext = file.name.slice(file.name.lastIndexOf('.') + 1);

      if (ext === 'cer') {
        certSelect.value = '';
        instance.verificationOptions.addTrustedCertificates([file]);
      } else if (ext === 'pdf') {
        docSelect.value = '';
        instance.loadDocument(file);
      }
    });
  });
})();
// eslint-disable-next-line spaced-comment
//# sourceURL=config.js
