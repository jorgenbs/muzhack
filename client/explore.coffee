logger = new Logger("explore")

searchTimeoutHandle = null

Template.explore.helpers({
  isEmpty: ->
    !Projects.findOne()?
  searchQuery: ->
    Router.current().params.query.query
})
Template.explore.events({
  "input #explore-search-input": (event) ->
    if searchTimeoutHandle?
      clearTimeout(searchTimeoutHandle)

    searchTimeoutHandle = setTimeout(->
      searchTimeoutHandle = null
      query = trimWhitespace(event.target.value)
      logger.debug("User is searching: '#{query}'")
      Router.go('home', {}, if !S.isBlank(query) then {query: "query=#{query}"} else {})
    , 500)
})

getQualifiedId = (project) ->
  "#{project.owner}/#{project.projectId}"

getIsotopeContainer = () -> $("#isotope-container")

createProjectElement = (project) ->
  getThumbnail = () ->
    if !R.isEmpty(project.pictures || []) then project.pictures[0].url else \
      '/images/revox-reel-to-reel-resized.jpg'

  $("<div class=\"project-item\" data-id=\"#{getQualifiedId(project)}\">
    <a href=\"/u/#{project.owner}/#{project.projectId}\">
      <div class=\"project-item-header\">
        <div class=\"project-item-title\">#{project.title}</div>
        <div class=\"project-item-author\">#{project.owner}</div>
      </div>
      <img class=\"project-item-image\" src=\"#{getThumbnail()}\" />
    </a>
  </div>")[0]

Template.explore.onRendered(->
  logger.debug("Template explore has been rendered")

  projects = Projects.find({}, {sort: [["created", "desc"]]})
  @autorun(->
    logger.debug("Installing change observer")
    ignore = true
    projects.observe({
      added: (project) ->
        if ignore
          return
        logger.debug("A project (#{getQualifiedId(project)}) was added, updating Isotope grid")
        $projElem = createProjectElement(project)
        getIsotopeContainer().isotope("insert", $projElem)
      ,
      changed: (project) ->
        qualifiedId = getQualifiedId(project)
        logger.debug("A project (#{qualifiedId}) was changed, updating Isotope grid")
        projectElem = document.querySelector("[data-id=#{qualifiedId}]")
        if !projectElem?
          logger.debug("Couldn't find element corresponding to project")
        else
          logger.debug("Found element corresponding to project, updating it")
      ,
      removed: (project) ->
        qualifiedId = getQualifiedId(project)
        logger.debug("A project (#{qualifiedId}) was removed, updating Isotope grid")
        projectElem = document.querySelector("[data-id='#{qualifiedId}']")
        if !projectElem?
          logger.debug("Couldn't find element corresponding to project")
        else
          logger.debug("Found element corresponding to project, removing it")
          getIsotopeContainer().isotope("remove", projectElem).isotope("layout")
      ,
    })
    ignore = false
    logger.debug("Installed change observer")
  )

  $projectElems = R.map(createProjectElement, projects)
  logger.debug("Configuring Isotope")
  getIsotopeContainer().isotope({
    itemSelector: ".project-item",
    layoutMode: 'fitRows',
  })
    .isotope("insert", $projectElems)
)
Template.explore.onDestroyed(->
  projElems = document.querySelectorAll(".project-item")
  logger.debug(
    "Template explore being destroyed, clearing Isotope container of #{projElems.length} item(s)")
  getIsotopeContainer().isotope("remove", projElems).isotope("destroy")
)
