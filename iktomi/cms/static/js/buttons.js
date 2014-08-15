/** @jsx React.DOM */

(function(){

    var buttonProto = {
        onClick: function(e){
            e.preventDefault();
            console.log("click", this);
        },
        render: function() {
            var action = this.props;
            var className = "button action-" + action.action + 
                                  (action.cls? " icon-" + action.cls: "");
            var url = this.state ?action.url.replace('ITEM_ID', this.state.id) : "";
            console.log(this.props, this.props.item_form)
            return <a href={url}
                      rel={action.mode}
                      title={action.hint || undefined}
                      onClick={this.onClick}
                      dataItemForm={this.props.item_form || undefined}
                      className={className}>{action.title}</a>
        }
    }

    var PostButton = React.createClass(buttonProto);

    window.ItemButtons = {
        "custom": React.createClass(buttonProto),
        "get": React.createClass(buttonProto),
        "post": React.createClass(buttonProto),
        "save-and-continue": React.createClass(buttonProto),
        "save-and-add": React.createClass(buttonProto),
        "save-and-back": React.createClass(buttonProto)
    }


    window.ButtonPanel = React.createClass({
        render: function() {
            //this.widgetsByName = {};
            var ws = [];
            for (var i=0; i<this.props.buttons.length; i++){
                var group = this.props.buttons[i];
                var buttons = [];

                for (var j=0; j<group.length; j++){
                    props = group[j];
                    props.form = this.props.form;
                    props.parent = this;
                    props.key = props.action + '-' + props.mode;

                    var Component = ItemButtons[props.action]||ItemButtons[props.mode];
                    var button = Component(props);

                    buttons.push(button);
                }

                if (buttons.length > 1) {
                    ws.push(<div key={buttons[0].props.key+'-group'}
                                 className="buttons-group">
                              {buttons}
                            </div>);
                } else {
                    ws.push(buttons[0])
                }
            }

            return <div>{ws}</div>;
        }
    });

    window.ButtonPanel.fromJSON = function(form, json){
        var buttons = JSON.parse(json);
        props = {form: form,
                 buttons: buttons};
        return ButtonPanel(props);
    }

})();
