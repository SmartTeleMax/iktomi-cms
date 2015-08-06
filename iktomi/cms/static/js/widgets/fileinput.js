Widgets.FileInput = Widgets.create(Widgets.Widget, {
    /*XXX does not work properly without multipart form send*/ 
    render: function() {
        return <input type="file"
                      name={this.props.input_name}  />;
    }
});

Widgets.ProgressBar = Widgets.create(Widgets.Widget,{
    render: function(){
        var percent = Math.round(this.props.complete)+"%";
        var pb_style = {width: percent};
        return <div className="progress_box" key="progress_box">
                  <div className="progress_percent" key="progress_percent" style={pb_style}></div>
                  <div className="progress_text" key="progress_text" >{percent}</div>
               </div>;    
    }
});

Widgets.AjaxFileInput = Widgets.create(Widgets.Widget, {
    getDefault: function(props){
        return {};
    },
    onProgress:function(e){
        this.setState({progress: e.loaded/e.total * 100});
    },
    onXHRLoad:function(e){
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
        }
    },
    onChange:function(event){
        var form = event.target.form;
        var itemForm = form.retrieve('ItemForm');
        var file = event.target.files[0];
        var fileSize = file.size;
        var url = this.props.upload_url+"?file="+(file.fileName || file.name);
        url += '&content-length=' + fileSize; 

        var xhr = new XMLHttpRequest();
        xhr.onload = this.onXHRLoad.bind(this);

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
    progressContainer:function(){
        var progressContainer = ""; 
        if(this.state.xhr){
            progressContainer = <div key="progress" className="progress_container">
                                  <a href="#" 
                                     key="cancel-button"
                                     className="progress_cancel" 
                                     onClick={this.cancelUploading}>Отмена</a>
                                     <Widgets.ProgressBar complete={this.state.progress}/>
                                </div>;
        }
        return progressContainer;
    },
    urlDiv: function(){
        var currentMode = this.state.value.mode.toString();
        var urlDiv = "";
        if(this.state.value.current_url){
            if(this.props.readonly){
                return <span key="url">{this.state.value.current_url.toString()}</span>;
            }
            if(currentMode == 'transient'){
                urlDiv = <div className="file_data">  
                           <p>Загружен временный файл<br />
                              <a key="url"
                                 target="_blank"
                                 href={this.state.value.current_url.toString()}>
                                 {this.state.value.transient_name.toString()}
                              </a>
                           </p>
                         </div>;
            }
            else if(currentMode = 'existing'){
                urlDiv = <div className="file_data">
                           <a key="url"
                              target="_blank" 
                              href={this.state.value.current_url.toString()} >
                              Прикреплённый файл
                           </a>
                         </div>;
            }
        }
        return urlDiv;
    },
    inputElements: function(){
        if(this.props.readonly){
            return '';
        }
        return [<input type="file"
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
                        value={this.state.value.transient_name} />]
    },
    render: function() {
        return <div>
                  {this.urlDiv()}
                  {this.inputElements()}
                  {this.progressContainer()}
               </div>;
    }
});
