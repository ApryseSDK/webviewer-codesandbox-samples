// @link WebViewerInstance: https://docs.apryse.com/api/web/WebViewerInstance.html
// @link UI.setLanguage: https://docs.apryse.com/api/web/UI.html#.setLanguage__anchor

WebViewer(
  {
    path: '../../../lib',
    additionalTranslations: {
      language: 'en',
      translations: { 'option.toolbarGroup.toolbarGroup-View': 'Edited View Label' },
    },
    webviewerServerURL: 'https://demo.pdftron.com/', // comment this out to do client-side only
    initialDoc: 'https://pdftron.s3.amazonaws.com/downloads/pl/demo-annotated.pdf',
  },
  document.getElementById('viewer')
).then(instance => {
  samplesSetup(instance);

  const currentLanguage = instance.UI.getCurrentLanguage();
  const radioButton = document.querySelector(`form > #${currentLanguage}`);
  if (radioButton) {
    radioButton.checked = true;
  }

  document.getElementById('form').onchange = e => {
    // Set language
    instance.UI.setLanguage(e.target.id);
  };
});
