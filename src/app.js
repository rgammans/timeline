import { MemoryMoment } from './rel_moment';

export class TimelineRelations {

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

        if (this.dataset) {
            this.dataset.add(this.events[loc]);
        }

        return when;
    }

    create_event_relative(name, start_idx,start_edge, start_ops ) {

        var start = new MemoryMoment(this.date_relations[start_idx][start_edge]);
        for (var o of start_ops) { start.append_op(o); }
        return this.create_event(name,start);

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
                if (! this.events[i].deleted) {
                    var date = this.dateProcessor(this.date_relations[i].start,this.date_relations[i].end);
                    this.events[i].start = date.start;
                    this.events[i].end = date.end;
                    this.dataset.update(this.events[i]);
                }

            }
        }

    }

    update_entry() {

        if (this.timeline) {
                var loc =  this.form_methods.get_id();
                var entry = this.events[loc]
                entry.content =this.form_methods.get_text();
                if (entry.editable) {
                    //TODO - Replace Date with a better string parser (Date.parse is much better)
                    var start_date = new Date( Date.parse(this.form_methods.get_startDate()));
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
                },
                onRemove: function (item, callback) {
                    var loc = item.id;
                    //Set a flag rather than deleting the item so it's position 
                    // in the array can't be reused
                    that.events[loc].deleted = true;
                    if (form_methods.get_id() == loc) {
                        form_methods.set_id(undefined)
                        form_methods.set_startDate('')
                        form_methods.set_endDate('')
                        form_methods.set_text('')
                    }
                    callback(item);
                }

            });
        }

        //Return a string representation on the managed data.
        serialize() {
            var rv_base = []
            var lookup_data= []
            var reference_list = []

            function add_date (date_obj,idx,dtype) {
                //Adds a date object to the reference list
                // if it is undefined we don't care.
                if (date_obj) {
                    reference_list.push(date_obj);
                    lookup_data.push({event_idx:idx,date_edge:dtype})
                }
            }
            function resolve_date(start) {
                    var refdata= null;
                    if (start instanceof MemoryMoment ){
                        refdata = start.findBase(reference_list);
                        if (refdata)  {
                            var resolved = lookup_data[refdata.index];
                            refdata.index = resolved.event_idx;
                            refdata.date_edge = resolved.date_edge;
                        } else {
                            console.warn("Failled to maintain all references");
                            refdata = start.toMoment();
                        }
                    } else {
                        refdata = start;
                    }
                    return refdata;
            }
            //Walk date_relations building a list of date which can
            // be used by find base.
            for(var i = 0; i < this.events.length; i++) {
                add_date(this.date_relations[i].start,i,'start');
                add_date(this.date_relations[i].end,i,'end');
            }
            //Walk the events building up a JSON friend ly list of events.
            for(var i = 0; i < this.events.length; i++) {
                var ev = this.events[i]
                if (ev.deleted ) {
                    //Let not keep our garbage about forever.
                    rv_base.push({deleted:true});

                } else if (ev.editable) {
                    //The degenreate case of an unlinked event.
                    rv_base.push(ev)
                } else {
                    //This event has links - start with the basic stuff.
                    var json_ev = { content:ev.content, id: ev.id };
                    var start = this.date_relations[i].start;
                    var end = this.date_relations[i].end;
                    json_ev.start = resolve_date(start);
                    json_ev.end = resolve_date(end);
                    rv_base.push(json_ev);
                }

            }
            return JSON.stringify(rv_base);
        }
        unserialize(data) {
            var objs = JSON.parse(data);
            var new_events = []
            var index_map= []
            var fixups =[]


            //Helper function to put back date references back in.
            
            function load_reldate(date,idx,edge) {
                if (typeof(date) == "string") {
                    return  moment(new Date(date));
                } else {
                    //Should be an object.
                    var referent_idx = index_map.indexOf(date.index);
                    if (referent_idx == -1) {
                        //Not found case , this could be because the referent was deleted,
                        //or because/ it hasn't been processed yet.
                        // Place a temporarry value and we will sort it out in the fix up phase.
                        var rv = new MemoryMoment(new Date(date.value));
                        for (var op of date.ops) { rv.append_op(op); }
                        //Append to fixups list..
                        fixups.push({ idx:idx, edge:edge, references:date.index, reference_edge:date.date_edge})
                    } else {
                        var edge = date.date_edge;
                        var base_event = new_events[referent_idx];
                        var rv = new MemoryMoment(base_event[edge]);
                        for (var op of date.ops) { rv.append_op(op); }
                    }
                    return rv;
                }
            }

            //Walk the list in the saved file.
            for (var o of objs) {
                if (o.editable) {
                    //This must be a simple object
                    var i = new_events.length ;
                    //Maintain a lookup of where our objects are.
                    index_map.push(o.id);
                    //Update id, and place it in our store.
                    o.id = i ;
                    new_events.push(o);
                    //Unfortanely JSON.stringify breaks dtae objs, soe we need to fix them up
                    // use JS Date to parse strings becuase moment is fussy.
                    if (o.start) {
                        new_events[i].start = moment(new Date(Date.parse(new_events[i].start)))
                    }
                    if (o.end) {
                        new_events[i].end = moment(new Date(Date.parse(new_events[i].end)))
                    }

                } else if (o.deleted) {
                    //Ignore deleted items.
                    continue;
                } else {
                    //Lets work out what we need.
                    var i = new_events.length ;
                    var evt= {};
                    evt.content = o.content;
                    evt.editable =  o.editable;
                    evt.id = i
                    index_map.push(i);
                    if (o.start) {
                        evt.start = load_reldate(o.start,i,'start');
                    }
                    if (o.end) {
                        evt.end = load_reldate(o.end,i,'end');
                    }
                    new_events.push(evt)
                }
            }

            // Walk the list of fixups, which are either forward references or references
            // to deleted objects.
            var abs_mem_moments = new Array(new_events.length);
            abs_mem_moments.fill({}); //Warning all positions have the same obj.
            for (var fixup of fixups ) {
                var referent_idx = index_map.indexOf(fixup.references);
                if (referent_idx = -1 ) {
                    //Not actually a relative, we might think we can just rewrit the value with 
                    // to Moment , but if anything is raltive to this that breaks the link.
                    abs_mem_moments[fixup.idx] = Object.assign({},abs_mem_monents[fixup.idx] );
                    abs_mem_moments[fixup.idx][fixup.edge] = true;
                } else {
                    var referent = new_events[referent_idx][fixup.reference_edge];
                    var obj_fix = new_events[fixup.idx]
                    if ( referent.toDate() != obj_fix[fixup.edge].toDate() ) { throw "date mismatch"}
                    else {   obj_fix[fixup.edge].base = referent; }
                }
            }
            // See there any any edible flags we can fliip becuase of unresavable references,
            // and copy into our main data structure.
            this.events =[]
            this.date_relations = []
            for (var i=0; i<  abs_mem_moments.length; ++i) {
                var am = abs_mem_moments[i];
                var ev = new_events[i];
                var start = ev.start;
                var end = ev.end;

                //Save the dates int the realtions arrays..
                this.date_relations.push({start:start, end:end});

                //Convert any non-relative dates.
                if (am.start) { start = start.toDate() }
                if (am.end ) { end = end.toDate() }

                //Format objects,
                var dates= this.dateProcessor(start,end);
                ev.editable = ev.editable || dates.editable;
                ev.start = dates.start;
                ev.end = dates.end;
                this.events.push(ev);
            }
            this.dataset.clear();
            this.dataset.add(this.events);
        }
}
