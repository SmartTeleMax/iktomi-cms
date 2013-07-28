from iktomi.unstable.forms.files import FileFieldSet

class AjaxFileField(FileFieldSet):

    template = 'widgets/ajax_fileinput'
    upload_endpoint = 'load_tmp_file'


class AjaxImageField(AjaxFileField):

    template = 'widgets/ajax_imageinput'
    #: used when file is uploaded
    thumb_size = None
    upload_endpoint = 'load_tmp_image'

    # Show the thumb or not. Works only with image option on
    show_thumbnail = True
    #: use js pre-upload thumbnail generation by canvas
    canvas_thumb_preview = False

