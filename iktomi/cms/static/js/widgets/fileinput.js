Widgets.FileInput = Widgets.create(Widgets.Widget, {
    /*XXX does not work properly without multipart form send*/ 
    render: function() {
        return <input type="file"
                      name={this.props.input_name}  />;
    }
});


Widgets.AjaxFileInput = Widgets.create(Widgets.Widget, {
    onChange:function(event){
        var form = event.target.form;
        var itemForm = form.retrieve('ItemForm');
        var file = event.target.files[0];
        var fileSize = file.size;
        var url = this.props.upload_url+"?file="+(file.fileName || file.name);
        url += '&content-length=' + fileSize; 

        var xhr = new XMLHttpRequest();
        xhr.onload = function(e){
          var status = e.target.status;
          var result = JSON.parse(e.target.response);
          if(result.status=='ok'){
            var fileUrl = result.file_url;
            var fileUrlSplitted= fileUrl.split("/");
            var transientName = fileUrlSplitted[fileUrlSplitted.length-1];
            this.setValue({
                transient_name:transientName,
                mode:"transient",
                current_url:fileUrl,
                original_name:result.original_name,
            })
          }
            
        }.bind(this);

        xhr.open('POST', url, true);
        xhr.send(file);
    },
    render: function() {
        var fileFields = [
                  <input type="file"
                         key="file"
                         onChange={this.onChange}  
                         name={this.props.input_name} />,
                  <input type="hidden" 
                         name="original_name"
                         key="original_name"
                         value={this.state.value.original_name} />,
                  <input type="hidden" 
                         name="mode"
                         key="mode"
                         value={this.state.value.mode} />,
                 <input type="hidden"
                         key="transient_name"
                         name="transient_name"
                         value={this.state.value.transient_name} />,
        ]
        if(this.state.value.current_url){
            fileFields.push(
                  <a key="url"
                     target="_blank" 
                     href={this.state.value.current_url.toString()} >
                     Прикрепленный файл
                  </a>
            )
        }
        return <div>{fileFields}</div>;
    }
});
