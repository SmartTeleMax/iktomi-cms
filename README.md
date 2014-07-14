# iktomi CMS


## Feature list

**incomplete**
**must be sorted by priority**

* Configurable dashboard and top menu
* Single-page, ajax-based, without page reloads in general.

### Streams
* Streams of object of the same type
    * Define list of object values 
    * Sorting stream object by field values
* Pluggable actions for objects in the stream: edit, delete, preview, 
  edit log, publishing, etc.
* Pluggable actions for entire stream: ordering, etc.
* Filtering a stream based on FilterForm.
    * Filtered by corresponding 
    * Allowed to use all the widgets available for edit form
      (many of them are useless here, never mind).
    * Ability to define custom filtering conditions for fields in FieldForm.
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
* Extendable WYSIWYG editor. **describe**
* Ajax file upload. **describe**
* Image cropping. **describe**
* Grouping values in field to collapsable FieldBlock-s.
* Widgets for selecting objects from another stream.

### More editing features

* Edit logging for an object (if edited is a stream).
    * Log edit, delete and publication actions, and others if implemented.
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
* Preview action. **describe**

### Publication

* Two-state based publishing system.
* Internationalized streams.

### Implementation details and minor features

* Embedded sqlalchemy model factories for all provided features,
  that can be imported and initiated in the application.
* Flashing messages from ajax request handlers throught cookies.
* JS and CSS packer based on one or multiple Manifest files.
  Allows to combine files from iktomi-cms pack and app-specific
  user-defined ones.

