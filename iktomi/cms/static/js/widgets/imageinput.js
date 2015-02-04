Widgets.AjaxImageInput = Widgets.create(Widgets.AjaxFileInput, {
    onXHRLoad:function(e){
        var result = JSON.parse(e.target.response);
        if(result.status=='ok'){
            this.setResponse(result);
        }
    },
    onAjaxCrop:function(response){
        var result = JSON.parse(response);
        if(result.status=='ok'){
            this.setResponse(result);
        }
    },
    setResponse:function(result){
        var fileUrl = result.file_url;
        var fileUrlSplitted= fileUrl.split("/");
        var transientName = fileUrlSplitted[fileUrlSplitted.length-1];
        this.setValue({
            transient_name:transientName,
            mode:"transient",
            current_url:fileUrl,
            original_name:result.original_name,
        });
        this.getItemForm().reactForm.setValue(result.related_files);
    },
    cropUrl: function(){
        if(this.state.value.upload_url){
            return this.state.value.upload_url.toString() + "/crop";
        }else{
            return this.props.upload_url.toString() + "/crop";
        }
    },
    showCropper:function(e){
        var sourceMode = this.state.value.source_mode ? this.state.value.source_mode.toString() : 'transient';
        new Cropper({src:this.state.value.source_url.toString(),
                     targetWidth:this.state.value.sizes[0].toString(),
                     targetHeight:this.state.value.sizes[1].toString(),
                     title:this.props.label,
                     cropUrl:this.cropUrl(),
                     postData:{mode:sourceMode,
                               transient_name:this.state.value.source_transient.toString()},
                     onAjaxCrop:this.onAjaxCrop});
    },
    image:function(){
        var currentMode = this.state.value.mode.toString();
        var image = '';
        if(currentMode != 'empty'){
            image = <div className="thumbnail-container">
                        <img className="thumbnail"
                              src={this.state.value.current_url.toString()} />
                        <a className="button icon-crop compact-button"
                           onClick={this.showCropper} >Кадрировать</a>
                    </div>;
        }
        return image;
    },
    inputElements: function(){
        var inputElements = '';
        if (this.props.allow_upload){
            inputElements = Widgets.AjaxFileInput.proto.inputElements.bind(this)();
        }
        return inputElements;
    },
    render:function(){
        var displayElement = '';
        if(this.props.show_image){
            displayElement = this.image();
        }else{
            displayElement = this.urlDiv();
        }
        return <div ref={this.props.input_name}>
                  {displayElement}
                  {this.inputElements()}
                  {this.progressContainer()}
               </div>;
    }
});
