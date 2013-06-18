var CheckFilesUploaded = new Class({
  Extends: PreSaveHook,

  delayed_text: 'Не все файлы были загружены на сервер. Пожалуйста, дождитесь окончания загрузки',
  delayed_index: 'file_upload',

  get_delayed: function(){
    var widgets = this.frm.retrieve('file_widgets');
    return widgets.some(function(x){return x.uploader.uploading_count > 0});
  }
});
