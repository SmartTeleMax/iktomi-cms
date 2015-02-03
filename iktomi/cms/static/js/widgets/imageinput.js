Widgets.AjaxImageInput = Widgets.create(Widgets.AjaxFileInput, {
    onXHRLoad:function(e){
        // XXX refactor code duplication with fileinput
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
            this.getItemForm().reactForm.setValue(result.related_files);
        }
    },
    image:function(){
        var currentMode = this.state.value.mode.toString();
        var image = '';
        if(currentMode != 'empty'){
            image = <img className="thumbnail"
                         src={this.state.value.current_url.toString()} />;
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
        return <div>
                  {displayElement}
                  {this.inputElements()}
                  {this.progressContainer()}
               </div>;
    }
});
 
