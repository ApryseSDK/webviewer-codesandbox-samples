const initialDocument = '../../files/SYH_Letter_red.docx';
let isViewingSampleDocument = true;

const prePopulate = {
  client_full_name: { val: 'Mrs. Eric Tragar', rows: 1 },
  client_gender_possesive: { val: 'her', rows: 1 },
  current_date: { val: '07/16/21', rows: 1 },
  dest_address: { val: '187 Duizelstraat\n5043 EC Tilburg, Netherlands', rows: 2 },
  dest_street_address: { val: '187 Duizelstraat', rows: 1 },
  dest_given_name: { val: 'Janice N.', rows: 1 },
  dest_surname: { val: 'Symonds', rows: 1 },
  dest_title: { val: 'Ms.', rows: 1 },
  land_location: { val: '225 Parc St., Rochelle, QC ', rows: 1 },
  lease_problem: { val: 'According to the city records, the lease was initiated in September 2010 and never terminated', rows: 3 },
  sender_name: { val: 'Arnold Smith', rows: 1 },
  logo: { val: '{"image_url":"../../files/logo_red.png", "width":64, "height":64}', rows: 2 },
};

function afterFirstLoad() {
  const els = document.getElementsByClassName('autofill-initial-hidden');
  let i;
  for (i = 0; i < els.length; i++) {
    els[i].className = '';
  }
  document.getElementById('doc-title').innerText = 'Sample Document';
}

WebViewer(
  {
    path: '../../../lib',
    preloadWorker: 'office',
    initialDoc: initialDocument,
    fullAPI: false,
  },
  document.getElementById('viewer')
).then(instance => {
  samplesSetup(instance);
  const { documentViewer } = instance.Core;
  const parentUrl = window.location.href;

  documentViewer.addEventListener('documentLoaded', async () => {
    await documentViewer.getDocument().documentCompletePromise();
    documentViewer.updateView();

    const doc = documentViewer.getDocument();
    const keys = doc.getTemplateKeys();

    const statusLabel = document.getElementById('current-status');
    statusLabel.innerText = 'Submit to populate the document preview';
    if (isViewingSampleDocument) {
      afterFirstLoad();
    } else {
      document.getElementById('doc-title').innerText = doc.getFilename();
    }
    document.getElementById('key-val-title').innerText = 'Key values :';

    if (keys) {
      const container = document.getElementById('autofill-form');

      while (container.hasChildNodes()) {
        container.removeChild(container.lastChild);
      }

      for (const i in keys) {
        const label = document.createElement('span');
        label.className = 'tag-label';
        label.appendChild(document.createTextNode(`${keys[i]}:`));
        container.appendChild(label);
        const input = document.createElement('textarea');
        input.rows = 1.4;
        input.className = 'value-field';
        input.type = 'text';
        input.name = keys[i];
        if (isViewingSampleDocument && input.name in prePopulate) {
          input.value = prePopulate[input.name].val;
          input.rows = prePopulate[input.name].rows + 0.4;
        }
        container.appendChild(input);
        container.appendChild(document.createElement('br'));
      }
      const input = document.createElement('input');
      input.type = 'submit';
      input.name = 'Autofill';
      container.appendChild(input);
      container.appendChild(document.createElement('br'));
    }
  });

  document.getElementById('file-picker').onchange = e => {
    const file = e.target.files[0];
    if (file) {
      isViewingSampleDocument = false;
      const autofillContainer = document.getElementById('autofill-form');

      while (autofillContainer.hasChildNodes()) {
        autofillContainer.removeChild(autofillContainer.lastChild);
      }
      loadDoc();
    }
  };

  async function loadDoc() {
    const file = document.getElementById('file-picker').files[0];
    if (file) {
      await instance.loadDocument(file);
      document.getElementById('file-status').innerText = 'File uploaded';
    }
  }

  async function autofillDoc() {
    const elements = document.getElementById('autofill-form').elements;
    const autofillMap = {};

    for (let i = 0, element; (element = elements[i++]); ) {
      if (element.className === 'value-field' && element.value.length > 0) {
        try {
          const json = JSON.parse(element.value);
          autofillMap[element.name] = json;
        } catch (e) {
          autofillMap[element.name] = element.value;
        }
      }
    }

    for (const entry in autofillMap) {
      if (autofillMap[entry].hasOwnProperty('image_url')) {
        const path = autofillMap[entry]['image_url'];
        if (path.substr(0, 4) != 'http') {
          autofillMap[entry]['image_url'] = parentUrl + path;
        }
      }
    }

    await documentViewer.getDocument().applyTemplateValues(autofillMap);
  }

  document.getElementById('autofill-form').onsubmit = e => {
    e.preventDefault();
    autofillDoc();
  };
});
