import $ from 'jquery';
import y from 'jquery-ui/ui/widgets/datepicker';
import { SimpleFileReader } from './simpleFile';
import { TimelineRelations } from './app';
import { MemoryMoment } from './rel_moment';

import "jquery-ui/themes/base/all.css"
import "jquery-ui/themes/base/datepicker.css"

function init() {
    //- Unfortunatley this is not compiled so I can't use Es6 syntax here.
    /** update select box from Memory moments ops */
    for (var i in MemoryMoment.ops) {
        var o = MemoryMoment.ops[i];
        var v = MemoryMoment.verbose_ops[i];
        var opt = new Option(v,o);
        $(opt).html=v;
        $('.relative_form .operation.prototype .input.optype').append(opt)
    }
        /** update select box from Memory moments ops */
    for (var i in MemoryMoment.units) {
        var o = MemoryMoment.units[i];
        var opt = new Option(o,o);
        $(opt).html=o;
        $('.relative_form .operation.prototype .input.units').append(opt)
    }    

    //** Define View handlers **/
    $('.absolute_form .startfield').datepicker( {
        altFormat:"yy-mm-dd",
        dateFormat:"dd/mm/yy",
        altField:$('.absolute_form .startfield_alt')
    });
    $('.absolute_form .endfield').datepicker( {
        altFormat:"yy-mm-dd",
        dateFormat:"dd/mm/yy",
        altField:$('.absolute_form .endfield_alt')
    });

    function _update_datepicker(picker, newd) {
        picker.datepicker('setDate',newd);
    }
    var form_methods = {}
    Object.assign(form_methods , {
        set_startDate : function (d) {
            _update_datepicker($('.absolute_form .startfield'),d);
        },
        set_endDate : function (d) {
            _update_datepicker($('.absolute_form .endfield'),d);
        },
        set_text : function (d) {
            $('.absolute_form .textfield').prop('value',d);
            $('.relative_form .event_name').html(d);
        },
        set_id : function (d) {
            $('.absolute_form .idfield').prop('value',d);
            this.enable_relative_form ( (typeof(d) != 'undefined') || (typeof(d) == 'null'));
        },
        get_startDate : function (d) {
            return $('.absolute_form .startfield_alt').prop('value');
        },
        get_endDate : function (d) {
            return $('.absolute_form .endfield_alt').prop('value');
        },
        get_text : function (d) {
            return $('.absolute_form .textfield').prop('value');
        },
        get_id : function (d) {
            return $('.absolute_form .idfield').prop('value');
        },
        disable_text : function (d) {
            $('.absolute_form .textfield').prop('diabled',d);
        },
        disable_id : function (d) {
            $('.absolute_form .idfield').prop('disabled',d);
        },
        disable_startDate : function (d) {
            $('.absolute_form .startfield').prop('disabled',d);
        },
        disable_endDate : function (d) {
            return $('.absolute_form .endfield').prop('disabled',d);
        },

        reset_update_form : function () {
            this.set_text("");
            this.set_id(null);
            this.set_startDate(null);
            this.set_endDate(null);
        },
        enable_relative_form: function (yesno) {
            $('.relative_form').toggle(!! yesno);
            if (yesno) {
                //Reset form.
                $('.relative_form .input.op_length').prop('value',0);
                $('.relative_form .input.op_length').prop('value',0);
                $('.relative_form .operations .list').empty();
                this.add_operation();
            }
        },
        add_operation: function () {
             var pane = $('.relative_form .operation.prototype').clone();
            // Add in the onclikc actions
            $('.add_button',pane).bind('click', function () { form_methods.add_operation(); });
            $('.del_button',pane).bind('click', function (e) { form_methods.remove_operation(e.target); });

             var idx =  $('.relative_form .input.op_length').prop('value');
            //This iindex is just a way of genertating a unique identfier if we add the item
            // we process the entries in DOM order.
             var itemsel = 'item'+idx;
             pane.removeClass('prototype').addClass('item'+idx);
             $('.relative_form .operations .list').append(pane);
             $('.relative_form .operations .'+itemsel).show()
             $('.relative_form .operations .'+itemsel +' .del_button').toggle(!! idx);
             $('.relative_form .input.op_length').prop('value',parseInt(idx)+1);
             $('.relative_form .input.textfield').prop('value',"");
        },
        remove_operation: function (target) {
            $(target).parent().addClass('removed').hide();
        },
        add_relative_event: function (app) {
            var content = $('.relative_form .input.textfield').prop('value')
            var ops = [];
            $('.relative_form .operations .list .operation').each(function () {
                var obj = {};
                if ( ! $(this).hasClass('removed') ){
                    obj.amt = $('.input.amt',this).prop('value');
                    obj.units = $('.input.units',this).prop('value');
                    obj.op = $('.input.optype',this).prop('value');
                    ops.push(obj);
                }
            });
            app.create_event_relative(content,this.get_id(),'start',ops);
        }
    });
    return form_methods;
}


/** Helper function from http://stackoverflow.com/questions/13405129 */
function download(text, name, type) {
    var file = new Blob([text], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, name);
    else {
        var a = document.createElement("a");
        var url = URL.createObjectURL(file);
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);  
         }, 0); 
    }
}

export function startup (){
    /**
    *  Initialise the dataset and launch the main app controller 
    */
    var form_methods = init();
    var container = document.getElementById('vis');
    var appobj = new TimelineRelations();

//*************************************************************************************************************************
// Make your edits here between these two rows of stars

var game_start =            appobj.create_event("Game Start",                          moment("2015-12-21"));
//s_happen =              appobj.create_event("Something Happend",                   new MemoryMoment(game_start).subtract(2,'months'));
                        appobj.create_event("Guy Fawkes",                          moment("2015-11-05"));
// other =                 appobj.create_event("Another thing happens",               s_happen.add(1,'day')); 
var today              =    appobj.create_event("England declares WAR!",               moment());

//****************************************************************************************************************************

    appobj.run(container,form_methods);
    document.getElementById('warn').style.display = "none";

    // Add event bindings into the startup JS; as Html file no longer has
    // the targets in scope
    $('#update-button').bind('click',function(e) { return appobj.update_entry(e) } );
    $('#save-button').bind('click',function(e) { return download(appobj.serialize(),'timeline.jsn','text/json') });
    $('#create-button').bind('click',function() { return form_methods.add_relative_event(appobj)  });

    document.x= new SimpleFileReader($('#filebox'),'fileload',{
        display_content:true,
        onload: function(data) { appobj.unserialize(data); }
    });

}

