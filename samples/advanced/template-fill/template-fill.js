let editor = undefined;
let viewedDocSchema = {};
let annotations = [];
let annotationsByTag = {};

const sampleFilePath = {
  'SYH-letter': '../../samples/files/template-SYH-letter.docx',
  'invoice-simple': '../../samples/files/template-invoice-simple.docx',
  'invoice-complex': '../../samples/files/template-invoice-complex.docx',
};
const queryDoc = new URLSearchParams(window.location.search).get('doc');
if (queryDoc in sampleFilePath) {
  document.getElementById('samples-file-picker').value = queryDoc;
}
let viewingFile = document.getElementById('samples-file-picker').value || 'SYH-letter';

WebViewer(
  {
    path: '../../../lib',
    preloadWorker: 'office',
    fullAPI: false,
  },
  document.getElementById('viewer')
).then(instance => {
  const { UI, Core } = instance;
  const { documentViewer } = instance.Core;

  UI.disableFeatures(UI.Feature.Annotations);

  loadDoc();

  async function loadDoc() {
    updateFileStatus();
    // Loading the template document with doTemplatePrep, so that we can access the schema and bounding boxes:
    await instance.loadDocument(sampleFilePath[viewingFile] || viewingFile, {
      officeOptions: {
        doTemplatePrep: true,
      },
    });
  }

  async function generateDocument() {
    const templateValues = editor.getValue();
    convertLinks(templateValues);
    // Fill the template document with the data from templateValues:
    await documentViewer
      .getDocument()
      .applyTemplateValues(templateValues)
      .then(updateAnnotations)
      .catch(e => UI.displayErrorMessage(e.message));
  }

  documentViewer.addEventListener('documentLoaded', async () => {
    // Get the schema of the template keys used in the document:
    const schema = await documentViewer
      .getDocument()
      .getTemplateKeys('schema')
      .catch(e => UI.displayErrorMessage(e.message));
    const jsonSchema = templateSchemaToJsonSchema(schema);
    await updateAnnotations(instance);

    if (!editor || JSON.stringify(schema) !== JSON.stringify(viewedDocSchema)) {
      viewedDocSchema = schema;
      const options = {
        theme: 'pdftron',
        iconlib: 'pdftron',
        schema: jsonSchema,
        prompt_before_delete: false,
        disable_properties: true,
        disable_array_reorder: true,
        disable_array_delete_last_row: true,
        disable_array_delete_all_rows: true,
        expand_height: true,
        keep_oneof_values: false,
      };
      if (viewingFile in prePopulateData) {
        options.startval = prePopulateData[viewingFile];
      }
      if (editor) {
        editor.destroy();
      }
      editor = new JSONEditor(document.getElementById('autofill-form'), options);
      viewedDocSchema = schema;
      editor.on('ready', pageModificationsAfterLoad);
      editor.on('ready', addEventHandlersToJsonEditor);
      editor.on('addRow', addEventHandlersToJsonEditor);
    }
  });

  class UnselectableSelectionModel extends Core.Annotations.SelectionModel {
    constructor(annotation) {
      super(annotation, false);
    }
    drawSelectionOutline() {}
    testSelection() {
      return false;
    }
  }

  async function updateAnnotations() {
    Core.annotationManager.deleteAnnotations(annotations, true);
    annotations = [];
    annotationsByTag = {};
    const fillColor = new Core.Annotations.Color(255, 255, 0, 0.2);
    const strokeColor = new Core.Annotations.Color(150, 150, 0, 1);
    // Get the bounding boxes of the template keys in the document:
    const boundingBoxes = await documentViewer
      .getDocument()
      .getTemplateKeys('locations')
      .catch(e => UI.displayErrorMessage(e.message));
    if (boundingBoxes) {
      for (const tag in boundingBoxes) {
        for (const boundingBox of boundingBoxes[tag]) {
          const pageNum = boundingBox[0];
          const rect = boundingBox[1];
          const annotation_rect = new Core.Math.Rect(rect.x1 - 2, rect.y1 - 2, rect.x2 + 2, rect.y2 + 2);
          const annotation = new Core.Annotations.RectangleAnnotation();
          annotation.setRect(annotation_rect);
          annotation.setPageNumber(pageNum);
          annotation.FillColor = fillColor;
          annotation.StrokeColor = strokeColor;
          annotation.StrokeThickness = 1;
          annotation.selectionModel = UnselectableSelectionModel;
          annotation.Hidden = true;
          annotations.push(annotation);
          if (!annotationsByTag.hasOwnProperty(tag)) {
            annotationsByTag[tag] = [];
          }
          annotationsByTag[tag].push(annotation);
        }
      }
    }
    Core.annotationManager.addAnnotations(annotations, true);
    Core.annotationManager.drawAnnotationsFromList(annotations);
  }

  function showAnnotationsForTemplateTag(templateTag) {
    const annotations = annotationsByTag[templateTag];
    if (annotations && documentViewer.getDocument()) {
      Core.annotationManager.showAnnotations(annotations);
      const visiblePages = documentViewer
        .getDisplayModeManager()
        .getDisplayMode()
        .getVisiblePages(0.0);
      for (const annotation of annotations) {
        if (visiblePages.includes(annotation.getPageNumber())) {
          return;
        }
      }
      Core.annotationManager.jumpToAnnotation(annotations[0]);
    }
  }

  function hideAnnotationsForTemplateTag(templateTag) {
    const annotations = annotationsByTag[templateTag];
    if (annotations && documentViewer.getDocument()) {
      Core.annotationManager.hideAnnotations(annotations);
    }
  }

  function addEventHandlersToJsonEditor() {
    for (const type of ['je-checkbox', 'je-textarea', 'je-header', 'je-object__container']) {
      for (const el of document.getElementsByClassName(type)) {
        if (!el || el.getAttribute('has-annotation-listeners') === 'true') {
          continue;
        }
        el.setAttribute('has-annotation-listeners', 'true');
        let schemaPathNode, mouseEventNode;
        if (type === 'je-checkbox') {
          schemaPathNode = el.parentNode.parentNode.parentNode;
          mouseEventNode = el.parentNode.parentNode.parentNode;
        } else if (type === 'je-textarea') {
          schemaPathNode = el.parentNode.parentNode.parentNode;
          mouseEventNode = el.parentNode.parentNode.parentNode.parentNode.parentNode;
        } else if (type === 'je-header') {
          schemaPathNode = el.parentNode;
          mouseEventNode = el;
          if (schemaPathNode.getAttribute('data-schematype') !== 'array') {
            continue;
          }
        } else if (type === 'je-object__container') {
          schemaPathNode = el.parentNode.parentNode;
          mouseEventNode = el.parentNode.parentNode;
        }
        const schemaPath = schemaPathNode.getAttribute('data-schemapath');
        if (!schemaPath) {
          continue;
        }
        const templateTag = convertJsonEditorSchemaPathToTemplateTag(schemaPath);
        const showAnnotationsFunc = showAnnotationsForTemplateTag.bind(null, templateTag);
        const hideAnnotationsFunc = hideAnnotationsForTemplateTag.bind(null, templateTag);
        mouseEventNode.addEventListener('mouseenter', showAnnotationsFunc);
        mouseEventNode.addEventListener('mouseleave', hideAnnotationsFunc);
      }
    }
  }

  document.getElementById('file-picker').onchange = e => {
    const file = e.target.files[0];
    if (file) {
      document.getElementById('samples-file-picker').selectedIndex = 0;
      viewingFile = file;
      loadDoc();
    }
  };
  document.getElementById('samples-file-picker').onchange = e => {
    viewingFile = e.target.value;
    loadDoc();
  };
  document.getElementById('reset-document-button').onclick = loadDoc;
  document.getElementById('generate-document-button').onclick = async () => {
    await generateDocument();
    await generateDocument();
  };
});

function templateSchemaKeyValuesToJsonSchema(templateKV) {
  const ret = {
    properties: {},
  };
  for (const key in templateKV) {
    const valTemplateSchema = templateKV[key];
    const valJsonSchema = {};
    ret['properties'][key] = valJsonSchema;
    valJsonSchema['propertyOrder'] = valTemplateSchema['docOrder'];
    switch (valTemplateSchema['typeId']) {
      case 'TemplateSchemaBool':
        valJsonSchema['$ref'] = '#/definitions/template-bool';
        break;
      case 'TemplateSchemaContent':
        valJsonSchema['$ref'] = '#/definitions/template-content';
        break;
      case 'TemplateSchemaLoop':
        const loopTypeSet = new Set(valTemplateSchema['loopType']);
        valJsonSchema['$ref'] = loopTypeSet.has('tableRow') && loopTypeSet.size === 1 ? '#/definitions/template-row-loop' : '#/definitions/template-loop';
        valJsonSchema['items'] = templateSchemaKeyValuesToJsonSchema(valTemplateSchema['itemSchema']);
        valJsonSchema['items']['title'] = key;
    }
  }
  return ret;
}

function templateSchemaToJsonSchema(templateSchema) {
  const ret = templateSchemaKeyValuesToJsonSchema(templateSchema['keys']);
  ret['$ref'] = '#/definitions/template-schema';
  ret['definitions'] = schemaDefinitions;
  return ret;
}

function convertJsonEditorSchemaPathToTemplateTag(path) {
  // json editor schema paths looks like: root.<key>                      => return <key>
  // json editor loop schema paths look like: root.<key1>.<index>.<key2>  => return <key1::key2>
  const comps = path.split('.');
  const ret = [];
  if (comps.length % 2 === 1) {
    return '';
  }
  for (let i = 1; i < comps.length; i++) {
    if (i % 2 === 1) {
      ret.push(comps[i]);
    }
  }
  return ret.join('::');
}

function pageModificationsAfterLoad() {
  for (const el of document.getElementsByClassName('autofill-initial-hidden')) {
    el.className = '';
  }
  document.getElementById('prep-message').style.display = 'none';
}

function updateFileStatus() {
  document.getElementById('file-status').innerText = viewingFile.name || viewingFile;
}

function convertLinks(json) {
  const referenceLinkConverter = document.getElementById('reference-link-converter');
  if (!json || typeof json != 'object') {
    return;
  }
  if (Array.isArray(json)) {
    for (const item of json) {
      convertLinks(item);
    }
    return;
  }
  for (const entry in json) {
    if (entry === 'image_url') {
      referenceLinkConverter.href = json[entry];
      json[entry] = referenceLinkConverter.href;
    } else {
      convertLinks(json[entry]);
    }
  }
}

const prePopulateData = {
  'SYH-letter': {
    client_full_name: 'Mrs. Eric Tragar',
    client_gender_possesive: 'her',
    date: '07/16/21',
    dest_address: '187 Duizelstraat\n5043 EC Tilburg, Netherlands',
    dest_given_name: 'Janice N.',
    dest_surname: 'Symonds',
    dest_title: 'Ms.',
    land_location: '225 Parc St., Rochelle, QC ',
    lease_problem: 'According to the city records, the lease was initiated in September 2010 and never terminated',
    sender_name: 'Arnold Smith',
    logo: {
      image_url: '../../files/logo_red.png',
      width: 64,
      height: 64,
    },
  },
  'invoice-simple': {
    invoice_number: 3467821,
    bill_to_name: 'Victoria Guti\u00e9rrez',
    bill_to_address: '218 Spruce Ave.\nAnna Maria, FL\n34216',
    ship_to_name: 'Mar\u00eda Rosales',
    ship_to_address: '216 E. Kennedy Blvd.\nTampa, FL\n34202',
    total_due: '430.50',
    total_paid: '150.00',
    total_owing: '280.50',
    items: [
      {
        description: 'Item 1',
        qty: 1,
        price: '10.00',
        total: '10.00',
      },
      {
        description: 'Item 2',
        qty: 20,
        price: '20.00',
        total: '400.00',
      },
      {
        description: 'Item 3',
        qty: 1,
        price: '0.00',
        total: '0.00',
      },
    ],
    subtotal: '410.00',
    sales_tax_rate: '5.0%',
    sales_tax: '20.50',
  },
  'invoice-complex': {
    invoice_number: 3467821,
    bill_to_name: 'Victoria Guti\u00e9rrez',
    bill_to_address: '218 Spruce Ave.\nAnna Maria, FL\n34216',
    ship_to_name: 'Mar\u00eda Rosales',
    ship_to_address: '216 E. Kennedy Blvd.\nTampa, FL\n34202',
    total_due: '880.50',
    total_paid: '150.00',
    total_owing: '730.50',
    pay_by_date: 'Dec 31 2021',
    pay_by_date_elapsed: false,
    vendors: [
      {
        vendor: 'OEM Corp.',
        items: [
          {
            description: 'Item 1',
            qty: 1,
            price: '10.00',
            total: '10.00',
          },
          {
            description: 'Item 2',
            qty: 20,
            price: '20.00',
            total: '400.00',
          },
        ],
        subtotal: '410.00',
        sales_tax_rate: '5.0%',
        sales_tax: '20.50',
        amount_due: '430.50',
      },
      {
        vendor: 'ABC Logistics',
        items: [
          {
            description: 'Freight, mile',
            qty: 84,
            price: '5.00',
            total: '420.00',
          },
          {
            description: 'Pickup',
            qty: 1,
            price: '30.00',
            total: '30.00',
          },
        ],
        subtotal: '450.00',
        sales_tax_rate: '5.0%',
        sales_tax: '22.50',
        discount: '-22.50',
        amount_due: '450.00',
      },
    ],
  },
};

const schemaDefinitions = {
  'template-schema': {
    type: 'object',
    title: 'Template data',
  },
  'template-bool': {
    type: 'boolean',
    format: 'checkbox',
  },
  'template-text': {
    type: 'string',
    format: 'textarea',
  },
  'template-loop': {
    type: 'array',
    items: {
      type: 'object',
    },
  },
  'template-row-loop': {
    $ref: '#/definitions/template-loop',
    format: 'table',
  },
  'template-image': {
    type: 'object',
    properties: {
      image_url: {
        $ref: '#/definitions/template-text',
        propertyOrder: 1,
        format: 'url/file-download',
      },
      width: {
        type: 'integer',
        title: 'width (points)',
        propertyOrder: 2,
      },
      height: {
        type: 'integer',
        title: 'height (points)',
        propertyOrder: 3,
      },
    },
  },
  'template-content': {
    oneOf: [
      {
        title: 'text',
        $ref: '#/definitions/template-text',
      },
      {
        title: 'image',
        $ref: '#/definitions/template-image',
      },
    ],
  },
};
