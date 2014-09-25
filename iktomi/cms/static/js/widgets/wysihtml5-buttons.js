/** @jsx React.DOM */

(function(){
  WysiHtml5.Buttons = {};

  WysiHtml5.Buttons.blockquote = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="blockquote" className="btn">Цитата</a>;
    }
  });

  WysiHtml5.Buttons.bold = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="bold" className="btn">Полужирный</a>;
    }
  });

  WysiHtml5.Buttons.createLink = React.createClass({
    render: function(){
        return <div className="wysihtml5-dialog-place">
          <a data-wysihtml5-command="createLink" className="btn">Вставить ссылку</a>
          <div className="wysihtml5-dialog"
               style={{display: "none"}}
               id={this.props.id + "-create-link"}>
            <label>
              Ссылка:
              <input data-wysihtml5-dialog-field="href"
                     defaultValue="http://" className="text"></input>
            </label>
            <div className="nowrap">
              <a data-wysihtml5-dialog-action="save">Применить</a>
              {' '}
              <a data-wysihtml5-command="unlink">Удалить ссылку</a>
            </div>
          </div>
        </div>;
    }
  });

  WysiHtml5.Buttons.extrachars = React.createClass({
    render: function(){
        return <div className="wysihtml5-dialog-place">
          <a data-wysihtml5-command="extrachars" className="btn">Специальные символы</a>
          <div className="wysihtml5-dialog" data-wysihtml5-dialog="extrachars"
               style={{display: "none", width: "230px", left: "-110px"}}>
            <a data-wysihtml5-command="insertHTML" data-wysihtml5-command-value="—"
               className="wysihtml5-char">—</a>
            <a data-wysihtml5-command="insertHTML" data-wysihtml5-command-value="–"
               className="wysihtml5-char">–</a>
            <a data-wysihtml5-command="insertHTML" data-wysihtml5-command-value="±"
               className="wysihtml5-char">±</a>
            <a data-wysihtml5-command="insertHTML" data-wysihtml5-command-value="…"
               className="wysihtml5-char">…</a>
            <a data-wysihtml5-command="insertHTML" data-wysihtml5-command-value="«"
               className="wysihtml5-char">«</a>
            <a data-wysihtml5-command="insertHTML" data-wysihtml5-command-value="»"
               className="wysihtml5-char">»</a>
            <a data-wysihtml5-command="insertHTML" data-wysihtml5-command-value="©"
               className="wysihtml5-char">©</a>
            <a data-wysihtml5-command="insertHTML" data-wysihtml5-command-value="™"
               className="wysihtml5-char">™</a>
            <a data-wysihtml5-command="insertHTML" data-wysihtml5-command-value="&nbsp;"
               className="wysihtml5-char">неразрывный пробел</a>
          </div>
        </div>;
    }
  });


  WysiHtml5.Buttons.headings = React.createClass({
    render: function(){
      var buttons = [];
      for (var i=1; i<7; i++){
        if (this.props.allowed_elements.indexOf('h'+i) != -1){
          buttons.append(<a data-wysihtml5-command={"h"+i}>{"Заголовок " +i}</a>);
        }
      }

      return <div className="wysihtml5-dialog-place">
          <a data-wysihtml5-command="headings" className="btn">Заголовок</a>
          <div className="wysihtml5-dialog wysihtml5-menu"
               data-wysihtml5-dialog="headings"
               style={{display: "none"}}>
            {buttons}
          </div>
        </div>;
    }
  });

  WysiHtml5.Buttons.html = React.createClass({
    render: function(){
        return <a data-wysihtml5-action="change_view"
                  title="Show HTML" className="btn"></a>;
    }
  });

  WysiHtml5.Buttons.indent = React.createClass({
    render: function(){
        return <a data-wysihtml5-command="indent"
                  className="btn disabled">Увеличить отступ</a>;
    }
  });

  WysiHtml5.Buttons.insertImage = React.createClass({
    render: function(){
        return <div className="wysihtml5-dialog-place">
          <a data-wysihtml5-command="insertImage"
             className="btn">Вставить изображение</a>
          <div className="wysihtml5-dialog" data-wysihtml5-dialog="insertImage"
               style={{display: "none"}}>
            <label>
              Ссылка на изображение:
              <input data-wysihtml5-dialog-field="src"
                     defaultValue="http://" className="text"></input>
            </label>
            <br/>
            <a data-wysihtml5-dialog-action="save">Применить</a>
          </div>
        </div>
    }
  });

  WysiHtml5.Buttons.insertorderedlist = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="insertorderedlist"
                className="btn">Нумерованный список</a>;
    }
  });

  WysiHtml5.Buttons.insertunorderedlist = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="insertunorderedlist"
                className="btn">Список</a>;
    }
  });

  WysiHtml5.Buttons.italic = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="italic" className="btn">Курсив</a>;
    }
  });

  WysiHtml5.Buttons.outdent = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="outdent"
                className="btn disabled">Уменьшить отступ</a>
    }
  });

  WysiHtml5.Buttons.redo = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="redo" className="btn disabled">Повторить</a>;
    }
  });

  WysiHtml5.Buttons.sub = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="sub" className="btn">Верхний индекс</a>;
    }
  });

  WysiHtml5.Buttons.sup = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="sup" className="btn">Верхний индекс</a>;
    }
  });

  WysiHtml5.Buttons.table = React.createClass({
    render: function(){
      return <div className="wysihtml5-dialog-place">
          <a data-wysihtml5-command="table" className="btn">Вставить таблицу</a>
          <div className="wysihtml5-dialog"  data-wysihtml5-dialog="table"
               id={this.props.id +"-table"}
               style={{display: "none", "min-width": "150px"}}>
            <label style={{display: "inline-block", width: "75px"}}>
              Столбцы:
            </label>
            <input data-wysihtml5-dialog-field="cols" defaultValue="2"
                   className="text" size="3"></input>
            <br></br>
            <label style={{display: "inline-block", width: "75px"}}>
              Строки:
            </label>
            <input data-wysihtml5-dialog-field="rows" defaultValue="2"
                   className="text" size="3"></input>

            <br></br>
            <a data-wysihtml5-dialog-action="save">ОК</a>
          </div>
          <div className="wysihtml5-dialog wysihtml5-menu"
               id={this.props.id + "-table-buttons"}
               style={{display: "none"}}>
              <a data-wysihtml5-command="splitCells">Разделить ячейку</a>
              <a data-wysihtml5-command="mergeCells">Объединить ячейки</a>
              <a data-wysihtml5-command="insertRowBefore">Добавить строку до</a>
              <a data-wysihtml5-command="insertRowAfter">Добавить строку после</a>
              <a data-wysihtml5-command="deleteRow">Удалить строку</a>
              <hr></hr>
              <a data-wysihtml5-command="insertColBefore">Добавить столбец до</a>
              <a data-wysihtml5-command="insertColAfter">Добавить столбец после</a>
              <a data-wysihtml5-command="deleteCol">Удалить столбец</a>
              <hr></hr>
              <a data-wysihtml5-command="cutRow">Вырезать строку</a>
              <a data-wysihtml5-command="copyRow">Копировать строку</a>
              <a data-wysihtml5-command="pasteRowBefore">Вставить строку до</a>
              <a data-wysihtml5-command="pasteRowAfter">Вставить строку после</a>
              <hr></hr>
              <a data-wysihtml5-command="deleteTable">Удалить таблицу</a>
          </div>
        </div>;
    }
  });

  WysiHtml5.Buttons.underline = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="underline" className="btn">Подчеркнутый</a>;
    }
  });

  WysiHtml5.Buttons.undo = React.createClass({
    render: function(){
      return <a data-wysihtml5-command="undo" className="btn disabled">Отменить</a>;
    }
  });
})();
