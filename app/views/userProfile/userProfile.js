'use strict'
let component = require('omniscient')
let R = require('ramda')
let S = require('underscore.string.fp')
let h = require('react-hyperscript')
let immutable = require('immutable')
let logger = require('js-logger').get('userProfile')

let ajax = require('../../ajax')
let {nbsp,} = require('../../specialChars')
let VCard = require('./vcard')
let {convertMarkdown,} = require('../../markdown')

require('./userProfile.styl')

let About = component('About', (user) => {
  return h('div', [
    h('h1', `About ${user.name}`),
    convertMarkdown(user.about),
  ])
})

let Projects = component('Projects', (user) => {
  return !R.isEmpty(user.projects) ? h('table#user-projects', [
    h('thead', [
      h('tr', [
        h('th', 'ID'),
        h('th', 'Name'),
        h('th', 'Created'),
      ]),
    ]),
    h('tbody', R.map((project) => {
      h('tr', [
        h('td', [
          h('a.user-project', {href: `/u/${owner}/${projectId}`,}, projectId),
        ]),
        h('td', [
          h('a.user-project', {href: `/u/${owner}/${projectId}`,}, title),
        ]),
        h('td', [
          h('a.user-project', {href: `/u/${owner}/${projectId}`,}, createdStr),
        ]),
      ])
    }, user.projects)),
  ]) : h('em', 'No projects.')
})

let Plans = component('Plans', ({user, cursor,}) => {
  let isLoggedInUser = cursor.get('loggedInUser').username === user.username
  return h('div', [
    isLoggedInUser ? h('#plan-buttons.button-group', [
      h('button#create-plan.pure-button', {'data-tooltip': 'Create project plan',}, 'New'),
      h('button#add-existing-plan.pure-button', {
        'data-tooltip': 'Add existing project plan',
      }, 'Add Existing'),
      h('hr'),
    ]) : null,
    !R.isEmpty(user.projectPlans) ? h('ul#planned-projects', R.map((projectPlan) => {
      return h('li', [
        h('a.planned-project', {href: projectPlan.url, target: '_blank',}, [
          h('span.icon-trello', projectPlan.name),
          isLoggedInUser ? h('div', [
            h('a.edit-project-plan', {href: '#', 'data-tooltip': 'Edit project plan',}, [
              h('span.icon-pencil3'),
            ]),
            h('a.remove-project-plan', {href: '#', 'data-tooltip': 'Remove project plan',}, [
              'span.icon-cross',
            ]),
            h('a.close-project-plan', {
              href: '#', 'data-tooltip': 'Remove project plan and close Trello board',
            }, [
              h('span.icon-bin'),
            ]),
          ]) : null,
        ]),
      ])
    }, user.projectPlans)) : h('em', 'No project plans.'),
  ])
})

let Media = component('Media', (user) => {
  return h('div', !R.isEmpty(user.soundCloudUploads) ? [
    h('h1#soundcloud-header', [
      h('span.icon-soundcloud', 'SoundCloud'),
    ]),
    h('p', `${S.words(user.name)[0]}'s sounds on SoundCloud`),
    h('ul#soundcloud-uploads'),
  ] : null)
})

let Workshops = component('Workshops', (user) => {
  return convertMarkdown(user.workshopsInfo)
})

let isActiveTab = (tabName, cursor) => {
  return cursor.cursor('userProfile').get('activeTab') === tabName
}

class UserTab {
  constructor(title, icon, enabled=true) {
    this.title = title
    this.icon = icon
    this.enabled = enabled
    this.name = title.toLowerCase()
    this.url = `#${title.toLowerCase()}`
  }

  getClasses(activeTab) {
    let classes
    if (this.name === activeTab) {
      logger.debug(`${this.name} is active tab`)
      classes = ['active',]
    } else {
      classes = []
    }
    return S.join(' ', R.concat(classes, !this.enabled ? ['disabled',] : []))
  }
}

module.exports.createState = () => {
  return immutable.fromJS({
    activeTab: 'projects',
  })
}

module.exports.routeOptions = {
  loadData: (cursor, params) => {
    return ajax.getJson(`users/${params.user}`)
      .then((user) => {
        logger.debug(`Loading user JSON succeeded:`, user)
        return {
          userProfile: {
            user: user,
            activeTab: 'projects',
          },
        }
      }, (reason) => {
        logger.warn(`Loading user JSON failed: '${reason}'`)
      })
  },
  render: (cursor) => {
    let profileCursor = cursor.cursor('userProfile')
    let user = profileCursor.get('user').toJS()
    let currentHash = cursor.cursor('router').get('currentHash')
    let profileTabs = [
      new UserTab('Projects'),
      new UserTab('Plans'),
      new UserTab('About'),
      new UserTab('Media', null, !R.isEmpty(user.soundCloudUploads)),
      new UserTab('Workshops', null, !S.isBlank(user.workshopsInfo)),
    ]
    let activeTab = R.contains(currentHash, R.map((tab) => {
      return tab.name
    }, profileTabs)) ? currentHash : 'projects'

    logger.debug(`Rendering profile of user '${user.username}', active tab '${activeTab}':`, user)
    let tabContents
    if (activeTab === 'about') {
      tabContents = About(user)
    } else if (activeTab === 'projects') {
      tabContents = Projects(user)
    } else if (activeTab === 'plans') {
      tabContents = Plans({user, cursor,})
    } else if (activeTab === 'media') {
      tabContents = Media(user)
    } else if (activeTab === 'workshops') {
      tabContents = Workshops(user)
    }

    return h('#user-pad', [
      h('.pure-g', [
        h('.pure-u-1-4', [
          VCard(user),
        ]),
        h('.pure-u-3-4', [
          h('ul.tabs', {role: 'tablist',}, R.map((profileTab) => {
            return h(`li.${S.join('.', profileTab.getClasses(activeTab))}`, [
              profileTab.enabled ? h('a', {
                role: 'tab',
                href: profileTab.url,
              }, [
                profileTab.icon != null ? h(`span.icon-${profileTab.icon}`, nbsp) : null,
                h('span', profileTab.title),
              ]) : h('div', [
                profileTab.icon != null ? h(`span.icon-${profileTab.icon}`, nbsp) : null,
                h('span', profileTab.title),
              ]),
            ])
          }, profileTabs)),
          h('#tab-contents', [tabContents,]),
        ]),
      ]),
    ])
  },
}
