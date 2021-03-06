'use strict'
let component = require('omniscient')
let h = require('react-hyperscript')
let logger = require('js-logger-aknudsen').get('project.editors')
let R = require('ramda')
let S = require('underscore.string.fp')

let {markdownService,} = require('../../markdown')
let {trimWhitespace,} = require('../../stringUtils')
let {ValidationError,} = require('../../errors')
let userManagement = require('../../userManagement')

let dropzoneService
if (__IS_BROWSER__) {
  dropzoneService = require('../../services/dropzoneService')

  require('dropzone/src/dropzone.scss')
  require('../dropzone.styl')
}

let DescriptionEditor = component('DescriptionEditor', {
  componentDidMount: function () {
    logger.debug(`DescriptionEditor did mount`)
    markdownService.renderDescriptionEditor(this.cursor.get('description'))
  },
}, () => {
  return h('div', [
    h('h2', 'Description'),
    h('.editor-container', [
      h('.wmd-panel', [
        h('#wmd-button-bar-description.wmd-button-bar'),
        h('textarea#wmd-input-description.wmd-input'),
        h('#wmd-preview-description.wmd-preview.wmd-panel'),
      ]),
    ]),
  ])
})

let InstructionsEditor = component('InstructionsEditor', {
  componentDidMount: function () {
    logger.debug(`InstructionsEditor did mount`)
    markdownService.renderInstructionsEditor(this.cursor.get('instructions'))
  },
}, () => {
  return h('div', [
    h('h2', 'Instructions'),
    h('.editor-container', [
      h('.wmd-panel', [
        h('#wmd-button-bar-instructions.wmd-button-bar'),
        h('textarea#wmd-input-instructions.wmd-input'),
        h('#wmd-preview-instructions.wmd-preview.wmd-panel'),
      ]),
    ]),
  ])
})

let pictureDropzone = null

let PicturesEditor = component('PicturesEditor', {
  componentDidMount: function () {
    let pictures = this.cursor.cursor('pictures').toJS()
    logger.debug('PicturesEditor did mount, pictures:', pictures)
    pictureDropzone = dropzoneService.createDropzone('picture-dropzone', true, pictures)
  },
}, () => {
  return h('div', [
    h('h2', 'Pictures'),
    h('#picture-dropzone.dropzone'),
  ])
})

let fileDropzone = null

let FilesEditor = component('FilesEditor', {
  componentDidMount: function () {
    let files = this.cursor.cursor('files').toJS()
    logger.debug('FilesEditor did mount, files:', files)
    fileDropzone = dropzoneService.createDropzone('file-dropzone', false, files)
  },
}, () => {
  return h('div', [
    h('h2', 'Files'),
    h('#file-dropzone.dropzone'),
  ])
})

let getParameters = (input, cursor) => {
  logger.debug(`Getting parameters from input`, input)
  let title = trimWhitespace(input.title)
  let description = markdownService.getDescription()
  let instructions = markdownService.getInstructions()
  let tags = R.map(trimWhitespace, S.wordsDelim(/,/, input.tagsString))
  let user = userManagement.getLoggedInUser(cursor)
  let username = user.username
  let licenseSelect = document.getElementById('license-select')
  let licenseId = input.licenseId
  if (licenseId == null) {
    throw new Error(`licenseId is null`)
  }
  if (S.isBlank(title) || R.isEmpty(tags)) {
    throw new ValidationError('Fields not correctly filled in')
  }
  if (S.isBlank(description)) {
    throw new ValidationError('Description must be filled in')
  }
  if (S.isBlank(instructions)) {
    throw new ValidationError('Instructions must be filled in')
  }
  let allPictures = pictureDropzone.getAcceptedFiles()
  if (R.isEmpty(allPictures)) {
    throw new ValidationError('There must be at least one picture')
  }
  let queuedPictures = pictureDropzone.getQueuedFiles()
  let queuedFiles = fileDropzone.getQueuedFiles()
  return [title, description, instructions, tags, licenseId, username, queuedPictures,
    queuedFiles,]
}

module.exports = {
  DescriptionEditor,
  InstructionsEditor,
  PicturesEditor,
  FilesEditor,
  getParameters,
  getPictureDropzone: () => {return pictureDropzone},
  getFileDropzone: () => {return fileDropzone},
}
