Widgets.FileInput = Widgets.create(Widgets.Widget, {
    /*XXX does not work properly without multipart form send*/ 
    render: function() {
        return <input type="file"
                      name={this.props.input_name}  />;
    }
});

Widgets.ProgressBar = Widgets.create(Widgets.Widget,{
    render: function(){
        var percent = this.props.complete.toFixed(2) +"%";
        var pb_style = {width: percent};
        return <div className="progress_box" key="progress_box">
                  <div className="progress_percent" key="progress_percent" style={pb_style}></div>
                  <div className="progress_text" key="progress_text" >{percent}</div>
               </div>;    
    }
});

Widgets.AjaxFileInput = Widgets.create(Widgets.Widget, {
    onProgress:function(e){
        this.setState({progress: e.loaded/e.total * 100});
    },
    onChange:function(event){
        var form = event.target.form;
        var itemForm = form.retrieve('ItemForm');
        var file = event.target.files[0];
        var fileSize = file.size;
        var url = this.props.upload_url+"?file="+(file.fileName || file.name);
        url += '&content-length=' + fileSize; 

        var xhr = new XMLHttpRequest();
        xhr.onload = function(e){
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
            });
            setTimeout(function(){this.setState({xhr: false})}.bind(this), 2000);
          }
        }.bind(this);

        xhr.upload.addEventListener('progress', this.onProgress.bind(this), false);

        this.setState({xhr: xhr, progress:0});
        xhr.open('POST', url, true);
        xhr.send(file);
    },
    cancelUploading: function(e){
        e.preventDefault(); e.stopPropagation();
        this.state.xhr.abort();
        this.setState({xhr: false})
        this.setValue({
            transient_name: "",
            mode:"empty",
            current_url:"",
            original_name:"",
        });
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
        if(this.state.value.current_url && this.state.value.current_url.text != ""){
            fileFields.push(
                  <a key="url"
                     target="_blank" 
                     href={this.state.value.current_url.toString()} >
                     Прикрепленный файл
                  </a>
            )
        }
        if(this.state.xhr){
            fileFields.push(<Widgets.ProgressBar complete={this.state.progress}/>);
            fileFields.push(<a href="#" key="cancel-button" onClick={this.cancelUploading}>Отмена</a>);
        }
        return <div>{fileFields}</div>;
    }
});
