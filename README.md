# iktomi CMS


## Feature list

**incomplete**,
**must be sorted by priority**

* Configurable dashboard and top menu.
* Single-page, ajax-based, without page reloads in general.

### Streams
* Streams provide similar edit form and actions for objects of the same type.
* Objects list page.
    * Define list of object values.
    * Ordering stream object by field values.
    * Pagination.
* Filtering a stream based on FilterForm.
    * Filtered by value of a field.
    * Allowed to use all the widgets available for edit form
      (many of them are useless here, never mind).
    * Ability to define custom filtering conditions for fields in FieldForm.
* Pluggable actions for objects in the stream: edit, delete, preview, 
  edit log, publishing, etc.
* Pluggable actions for entire stream: ordering, etc.
* Ability to define persistent query filter conditions for entire stream.
* Manual ordering of objects in a stream, saved to database
* Permissions system for accessing, creating, changing, deleting and
  publishing objects. Is extendable.
* Loners: a stream for just a one item, without list view.

### Edit

* Editing an object in the stream
* Autosave periodically and on page leave
* Draft forms. If form does not validate, it is saved as draft.
  Next time user opens the objects edit page, he gets the form in the state
  (invalid) he leaved it, with errors displayed. But invalid state of object
  is not commited.
* Item locks
    * Items are locked automatically for actions marked as lockable
    * Unable to edit item without lock ownership
    * Locks are browser tab-based, so editor can not be in editing conflict 
      with himself even if he had opened same objects in two tabs
    * Show lock owner when attempting to access locked item,
    * Ability to force the lock
    * Highlight locked items in the stream
* Before-delete warning with list of all items linking to current (having
  stream and accessible by the editor)

### Forms

* Representing, converting and validating objects by
  [iktomi forms](http://iktomi.readthedocs.org/en/latest/forms-basic.html).
* Extendable WYSIWYG editor. Is based on wysihtml5 and inherits its plugin system.
  By default, allows to do standart HTML formatting and cleanup, undo/redo,
  raw HTML editing.
* Flexible HTML cleanup converter implemented on top of [lxml.html.clean](http://lxml.de/api/lxml.html.clean-module.html),
  with tunable list of allowed tag names, attributes, classes, url schemes and other options,
  also fully-extendable.

* WYSIWYG buttons to display are chosen
  automatically on the base of converter allowed tags, when possible.
* Widgets for selecting objects from another stream for sqlalchemy relationships.
* Inline editing of item collections inside current object (sqlalchemy
  delete-orphan option). Depth of relationships to edit is not limited.
* Ajax file upload. Files in forms are uploaded without page reload and without
  blocking other fields to be edited.
* Automated generation of scaled/cropped image versions
    * Describe image resizing rules and sizes by ImageResizer objects and 
      their combinations.
    * Manual image cropping from the source image interface.
    * Scaled images are generated on Ajax upload, so preview and cropping
      is available immediately. Crop rectangle coordinates could be saved to the database.
    * Default cropping rectangles are displayed on first upload.
    * Ability to apply Pillow filters.
* Grouping values in field to collapsable FieldBlock-s.
  The title of the block could be constructed dinamically based on nested values.
* Long-press character autocomplete in text inputs and WYSIWYG.
  Hold a key to see a list of similar characters and choose the one you need.

### More editing features

* Edit logging for an object in a stream.
    * Log creation, edit, delete and publication actions, and others if implemented.
    * Save editor, date of edit, initial and resulting state of the form
    * Show field-based diff
    * Images are logged as thumbnails.
* Precommit hooks, allows to postpone a commit, warn editor for some possibly
  wrong conditions, etc.
    * Warn if file upload is in progress.
* Show linked items in different streams.
* Pluggable editor notes widget for an item.
* Trays (inboxes) for editors. An editor can send any object to another
  editor's tray.
* Preview item after edit or before publishing using real site views and templates.

### Publication

* Two-version based publishing system: all edits are applied on editing database.
  An editor with sufficient permission can publish the object
  and it will be replicated to front-end database.
* Base classes for creating sqlalchemy classes for editorial and published versions
  of objects.
* Internationalized streams (with finite language count), internationalized
  publishing streams.
* Language versions for an object can be with one-to-one item correspondence.
  If this option is on, object with same id are considered different language
  versions for the same item.
* Base classes supporting single-table storage of language versions of the object,
  allowing to define common fields for all versions (for example, for Photo images
  can be common, and titles can be specific for each language).
* Automated creation time and update time tracking.

### Implementation details and minor features

* Embedded sqlalchemy model factories for all provided features,
  that can be imported and initiated in the application.
* Flashing messages from ajax request handlers throught cookies.
* JS and CSS packer based on one or multiple Manifest files.
  Allows to combine files from iktomi-cms pack and app-specific
  user-defined ones.

## What next?

* Docs
* Tests
