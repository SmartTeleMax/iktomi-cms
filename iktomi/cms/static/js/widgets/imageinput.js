Widgets.AjaxImageInput = Widgets.create(Widgets.AjaxFileInput, {
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
 
