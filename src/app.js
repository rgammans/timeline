
class TimelineRelations {

    constructor($) {
       this.$ = $
       this.events = [];
       this.date_relations = [];
       this.timeline = null;
    }

     create_event(name,when,ended) {

        if (console.assert) {
            console.assert(this.events.length == this.date_relations.length, "Internal data inconsistent");
        }
        var loc =  this.events.length ;

        //Store the provided dates as is so they mantain any relationships.
        this.date_relations[loc] = { start:when, end: ended }
        var dates = this.dateProcessor(when,ended);
       //Id is our array index which makes the call backs easy
        this.events[loc] = {id:loc, content:name,start:dates.start,end:dates.end, editable:dates.editable};
        return when;
    }

    dateProcessor(when,ended) {

        //Convert to JS Dates for vis.
        var tend = typeof(ended);
        var tstart = typeof(when);
        var edit = true;
        if ((tend != "undefined") && (tend != "Date") && !(ended instanceof Date)) {
            ended  = ended.toDate();
        }

        if (when instanceof MemoryMoment) {
            edit = false;
        }


        if ((tstart != "undefined") && (tstart != "Date") && !( when instanceof Date)) {
            when  = when.toDate();
        }

        return { start:when,end:ended, editable:edit};
    }

    //This handle the face we get different Date types back from Vis.
    _update_start (start,new_value) {
        if (moment.isMoment(new_value)) {
            start.set(new_value.toObject());
        } else {
            var new_start = moment(new_value);
            start.set(new_start.toObject());
        }
    }

    onMove (item, callback) {
        //Check Item is of the correct form.
        this._update_start(this.date_relations[item.id].start,item.start);
        //update vis timeline
        callback(item);
        this.updateTimeline()
    }



    updateTimeline() {

        if (this.timeline) {
            for(var i = 0; i < this.events.length; i++) {
                var date = this.dateProcessor(this.date_relations[i].start,this.date_relations[i].end);
                this.events[i].start = date.start;
                this.events[i].end = date.end;
                this.dataset.update(this.events[i]);

            }
        }

    }

    update_entry() {

        if (this.timeline) {
                var loc =  this.form_methods.get_id();
                var entry = this.events[loc]
                entry.content =this.form_methods.get_text();
                if (entry.editable) {
                    //TODO - Replace Date with a better string parser
                    var start_date = new Date( this.form_methods.get_startDate());
                    this._update_start(this.date_relations[loc].start ,  start_date);
                //  $('.absolute_form .endfield').prop('value');
                }
                this.updateTimeline();
        }
    }


    run(time_container, form_methods) {
        var that = this;
        this.form_methods = form_methods;
        this.dataset = new vis.DataSet(this.events);
        this.timeline=new vis.Timeline(time_container,this.dataset,{
                snap: null,
                editable: {
                    add: true,         // add new items by double tapping
                    updateTime: true,  // drag items horizontally
                    remove: true       // delete an item by tapping the delete button top right
               },

                onMoving: function (item,callback) { that.onMove(item,callback);},
                onUpdate: function (item, callback) { 
                  var loc = item.id;
                  form_methods.set_id(item.id);
                  form_methods.set_text (item.content);
                  form_methods.set_startDate (item.start );
                  form_methods.set_endDate (item.end );
                  form_methods.disable_startDate ( ! that.events[loc].editable);
                  form_methods.disable_endDate ( ! that.events[loc].editable);


                },
                onAdd: function (item, callback) {
                    that.create_event(item.content,moment(item.start));
                    item.id = that.events.length -1;
                    callback(item);
                }

            });
        }
}
