    //Initialize Script variables
    var rate = 30;//Update rate in Hz or FPS
    script.setUpdateRate(rate);
    var yearSecs = 31556926;//Number of seconds in a year (365.24 days)
    var monthSecs = 2629743;//Number of seconds in a (rounded) month
    var daySecs = 86400;//Number of seconds in a day
    var hourSecs = 3600;//Number of seconds in an hour
    var minuteSecs = 60;//Number of seconds in a minute
    var UTCStamp = 0;//Holds UTC TimeUTCStamp for date calculation
    var UTCOffset = 0;//Holds UTC Time UTCOffset for local synchronization
    var frameTicker = 0;//Used to count frames for clip reset
    var deviceTicker = 0;//Used to init device with delay
    var counter = 0;//Used for loop iteration
    var stripArray = [];//Used to construct SysEx commands for scribble strip updates
    var olddevice;
    var assignArray = [];
        assignArray[0] = "track";
        assignArray[1] = "send";
        assignArray[2] = "pan";
        assignArray[3] = "plugin";
        assignArray[4] = "eq";
        assignArray[5] = "instrument";
    var viewsArray = [];
        viewsArray[0] = "midiTracks";
        viewsArray[1] = "inputs";
        viewsArray[2] = "audioTracks";
        viewsArray[3] = "audioInst";
        viewsArray[4] = "aux";
        viewsArray[5] = "buses";
        viewsArray[6] = "outputs";
        viewsArray[7] = "user";

function init()
{
    script.log("Script Init");

    //Synchronize Arrays 1-7
    for(counter=0;counter<8;counter++){
        //Init Motor Fader Positions
        local.sendPitchWheel(counter+1,local.values.strips.getChild('Strip '+(counter+1)).faderValue.get()*16383);
        //Pulse VU Meters at current value
        local.sendChannelPressure(counter+1,local.values.strips.getChild('Strip '+(counter+1)).meter.get()*14+(16*(counter)));
        //Init POT LEDs
        if(((local.values.strips.getChild('Strip '+(counter+1)).rotaryMode.get()-1)/16==3)||((local.values.strips.getChild('Strip '+(counter+1)).rotaryMode.get()-1)/16==7)){     
            local.sendCC(0,0x30+index,(local.values.strips.getChild('Strip '+(counter+1)).rotaryValue.get()*5)+(local.values.strips.getChild('Strip '+(counter+1)).rotaryMode.get()));
        }else{
            local.sendCC(0,0x30+counter,(local.values.strips.getChild('Strip '+(counter+1)).rotaryValue.get()*11)+(local.values.strips.getChild('Strip '+(counter+1)).rotaryMode.get()));
        }
        //Init Mute
        local.sendNoteOn(1,counter+16,local.values.strips.getChild('Strip '+(counter+1)).mute.get());
        //Init Solo
        local.sendNoteOn(1,counter+8,local.values.strips.getChild('Strip '+(counter+1)).solo.get());
        //Init Rec
        local.sendNoteOn(1,counter+0,local.values.strips.getChild('Strip '+(counter+1)).rec.get());
        //Init Select
        local.sendNoteOn(1,counter+24,local.values.strips.getChild('Strip '+(counter+1)).select.get());
         //Calculate Top Scribble Strip Array
        stripArray[counter]=local.values.strips.getChild('Strip '+(counter+1)).encoderName.get();
        if ((stripArray[counter].length)>7){
            stripArray[counter]=stripArray[counter].substring(0,7);
        }else{
            while((stripArray[counter].length)<7){
                stripArray[counter]+=" ";
            }
        } 
    }

    //Synchronize Arrays 8-15
    for(counter=8;counter<16;counter++){
       //Calculate Bottom Sysex
        stripArray[counter]=local.values.strips.getChild('Strip '+(counter-7)).faderName.get();
        if ((stripArray[counter].length)>7){
            stripArray[counter]=stripArray[counter].substring(0,7);
        }else{
            while((stripArray[counter].length)<7){
                stripArray[counter]+=" ";
            }
        } 
    }

    //Send Assembled String Array to scribble strips
    local.sendSysex(0x00,0x00,0x66,0x14,0x12,0x00,stripArray);

    //Calculate Clock Values
    UTCOffset = (yearSecs*1970) + (hourSecs*-2)+(minuteSecs*5) - 22;
    UTCStamp = util.getTimestamp();
    script.log(util.getTimestamp());
    hours = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)/hourSecs));
    //Output Hours Digits
    local.sendCC(1, 71, 48+Math.floor(Math.floor(hours%10)));
    local.sendCC(1, 72, 48+Math.floor(Math.floor(hours/10)));
    minutes = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs/minuteSecs));
    //Output Minutes Digits
    local.sendCC(1, 69, 48+Math.floor(Math.floor(minutes%10)));
    local.sendCC(1, 70, 48+Math.floor(Math.floor(minutes/10)));
    seconds = Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)%minuteSecs));
    //Output Seconds Digits
    local.sendCC(1, 67, 48+Math.floor(Math.floor(seconds%10)));
    local.sendCC(1, 68, 48+Math.floor(Math.floor(seconds/10)));

}

function update(deltaTime)
{

    //Get current UTC timestamp
    UTCStamp = util.getTimestamp();
    //Unused calculations for years and days based on UTC stamp
    //var years = Math.round(Math.floor((UTCStamp+UTCOffset)/yearSecs));
    //var days = Math.round(Math.floor(((UTCStamp+UTCOffset)%yearSecs)/daySecs));

    //Is calculated 'hours' value different from the displayed one?
    if(hours!=Math.floor(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)/hourSecs))){
        hours = Math.floor(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)/hourSecs));
        local.sendCC(1, 71, 48+Math.floor(Math.floor(hours%10)));
        local.sendCC(1, 72, 48+Math.floor(Math.floor(hours/10)));
    }
    //Is calculated 'minutes' value different form the displayed one?
    if(minutes!=Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)/minuteSecs))){
        minutes = Math.round(Math.floor((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs/minuteSecs));
        local.sendCC(1, 69, 48+Math.round(Math.floor(minutes%10)));
        local.sendCC(1, 70, 48+Math.round(Math.floor(minutes/10)));
    }
    //Is calculated 'seconds' value different from the displayed one?
    if(seconds!=Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)%minuteSecs))){
        
        seconds = Math.round(Math.floor(((((UTCStamp+UTCOffset)%yearSecs)%daySecs)%hourSecs)%minuteSecs));
        local.sendCC(1, 67, 48+Math.round(Math.floor(seconds%10)));
        local.sendCC(1, 68, 48+Math.round(Math.floor(seconds/10)));
    }

    

    // Check device change
    if(olddevice != local.parameters.devices.get()){
        deviceTicker++;
        if (deviceTicker==20){
            init();
            olddevice = local.parameters.devices.get();
            deviceTicker = 0;
        }
    }

    //Advance our frame counter
    frameTicker++;
    
    //Clear VU Meter Clip LED
    if (frameTicker>rate*1.5){
        frameTicker = 0;
        var i;
        for(i=0;i<8;i++){
            local.sendChannelPressure(1,15+(16*i));
        }
    }
}

//****MODULE SPECIFIC SCRIPTS********** */

function moduleParameterChanged(param)
{
    if(param.isParameter())
    {
        
        // Did we change the 'FlashOnSolo' mode ?
        if(param.name=="flashOnSolo"){
            var i;
            for(i=0;i<8;i++){
                if(local.values.strips.getChild('Strip '+(i+1)).solo.get()==1){local.values.strips.getChild('Strip '+(i+1)).solo.set("on");
                }else{
                if(local.values.strips.getChild('Strip '+(i+1)).solo.get()==127){local.values.strips.getChild('Strip '+(i+1)).solo.set("flash");}
                }
            }
        }

        //Did we change the selected strip ?
        if(param.name=="stripIndex"){
            var i;
            for(i=0;i<8;i++){
                if((param.get()==0)||(i+1!=param.get())){
                    //select[i].set("Off");
                    local.values.strips.getChild('Strip '+(i+1)).select.set("off");
                }else{
                    // select[i].set("Solid");
                    local.values.strips.getChild('Strip '+(i+1)).select.set("on");
                }
            }
        }

        //Did we change the encoders assign ?
        if(param.name=="encodersAssign"){
            var i;
            for(i=0;i<6;i++){
                if(param.get()!=i){
                    local.values.encoder_Assign.getChild(assignArray[i]).set(0);
                    local.sendNoteOn(1,i+40,0);
                }
                if(param.get()==i){
                    local.values.encoder_Assign.getChild(assignArray[i]).set(1);
                    local.sendNoteOn(1,i+40,127);
                }
            }
        }

        //Did we change the Views ?
        if(param.name=="activeView"){
            var i;
            for(i=0;i<8;i++){
                if(param.get()!=i){
                    local.values.views.getChild(viewsArray[i]).set(0);
                    local.sendNoteOn(1,i+62,0);
                }
                if(param.get()==i){
                    local.values.views.getChild(viewsArray[i]).set(1);
                    local.sendNoteOn(1,i+62,127);
                }
            }
        }
    }
}


function moduleValueChanged(value)
{
    if(value.isParameter())
    {
        if(value.name=="faderValue"){
            local.sendPitchWheel(parseInt(value.getParent().name.substring(5,6)),value.get()*16383);
        }else{
            if(value.name=="meter"){
                local.sendChannelPressure(1,(value.get()*14)+((parseInt(value.getParent().name.substring(5,6))-1)*16));
            }else{
                if(value.name=="select"){
                    local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+23,value.get());
                }else{
                    if(value.name=="rotaryValue"||value.name=="rotaryMode"){
                        index = parseInt(value.getParent().name.substring(5,6))-1;
                        if(((local.values.strips.getChild('Strip '+(index+1)).rotaryMode.get()-1)/16==3)||((local.values.strips.getChild('Strip '+(index+1)).rotaryMode.get()-1)/16==7)){
                            
                            local.sendCC(0,0x30+index,(local.values.strips.getChild('Strip '+(index+1)).rotaryValue.get()*5)+(local.values.strips.getChild('Strip '+(index+1)).rotaryMode.get()));
                        }else{
                            local.sendCC(0,0x30+index,(local.values.strips.getChild('Strip '+(index+1)).rotaryValue.get()*11)+(local.values.strips.getChild('Strip '+(index+1)).rotaryMode.get()));
                        }
                    }else{
                        if(value.name=="encoderName"){
                            // Update display with new encoder name
                            var index = parseInt(value.getParent().name.substring(1,2))-1;
                            var newLabel = value.get();
                            var short = 7-newLabel.length;
                            var i;
                            for (i=0;i<short;i++){
                                newLabel = newLabel+" ";
                            }
                            if(short>0){
                                local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7),newLabel);
                            }else{
                                local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7),newLabel.substring(0,7));
                            }
                            init();
                        }else{
                            if(value.name=="faderName"){
                                var index = parseInt(value.getParent().name.substring(1,2))-1;
                                var newLabel = value.get();
                                var short = 7-newLabel.length;
                                var i;
                                for (i=0;i<short;i++){
                                    newLabel = newLabel+" ";
                                }
                                if(short>0){
                                    local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7+56),newLabel);
                                }else{
                                    local.sendSysex(0x00,0x00,0x66,0x14,0x12,((index)*7)+56,newLabel.substring(0,7));
                                }
                                init();
                            }else{
                                if(value.name=="solo"){
                                    local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+7,value.get());
                                }else{
                                    if(value.name=="mute"){
                                        local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))+15,value.get());
                                    }else{
                                        if(value.name=="rec"){
                                            local.sendNoteOn(1,parseInt(value.getParent().name.substring(5,6))-1,value.get());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}


//*****MIDI MODULE SPECIFIC SCRIPTS*****

function noteOnEvent(channel, pitch, velocity)
{
    // Is it a 'Rec' button ?
    if (pitch >= 0 && pitch <= 7){
        var index = pitch;
        if (local.values.strips.getChild('Strip '+(index+1)).rec.get()==0){
            local.values.strips.getChild('Strip '+(index+1)).rec.set("on");
        }else{
            local.values.strips.getChild('Strip '+(index+1)).rec.set("off");
        }
    }

    //Is it a 'Solo' button ?
    if (pitch >= 8 && pitch <= 15){
        //Change solo strip state
        var index = pitch-8;
        if (local.values.strips.getChild('Strip '+(index+1)).solo.get()==0){
            if (local.parameters.flashOnSolo.get()){local.values.strips.getChild('Strip '+(index+1)).solo.set("flash");}
            else {local.values.strips.getChild('Strip '+(index+1)).solo.set("on");}
        }else{
            local.values.strips.getChild('Strip '+(index+1)).solo.set("off");
        }
    }

    //Is it a 'Mute' button ?
    if (pitch >= 16 && pitch <= 23){
        // Change mute strip state
        var index = pitch-16;
        if (local.values.strips.getChild('Strip '+(index+1)).mute.get()==0){
            local.values.strips.getChild('Strip '+(index+1)).mute.set("on");
        }else{
            local.values.strips.getChild('Strip '+(index+1)).mute.set("off");
        }
    }

    //Is it a 'Select' button?
    if (pitch >= 24 && pitch <= 31){
        //Set new selected strip value    
        local.parameters.stripIndex.set(pitch-23);
    }
    
    //Is it a 'Push' button?
    if (pitch >= 32 && pitch <= 39){
        var index = pitch-32;
        if(velocity==127) {local.values.strips.getChild('Strip '+(index+1)).push.set(1);}
    }
    
    //Is it a 'Encoder assign' button?
    if (pitch >= 40 && pitch <= 45){
        local.parameters.encodersAssign.setData(pitch-40);
    }
    
    //Is it a 'Move' button?
    if (pitch >= 46 && pitch <= 49){
        if (pitch == 46) {local.parameters.bankIndex.set(local.parameters.bankIndex.get()-1);}
        if (pitch == 47) {local.parameters.bankIndex.set(local.parameters.bankIndex.get()+1);}
        if (pitch == 48) {local.parameters.stripIndex.set(local.parameters.stripIndex.get()-1);}
        if (pitch == 49) {local.parameters.stripIndex.set(local.parameters.stripIndex.get()+1);}
    }
    
    //Is it a 'Visual' button?
    if (pitch >= 50 && pitch <= 53){
        if (pitch == 50) {if(velocity==127){script.log("Flip");local.values.main.flip.set(1);}}
        if (pitch == 51) {if(velocity==127){script.log("Global View");local.values.views.globalView.set(1);}}
        if (pitch == 52) {if(velocity==127){script.log("Name/Value");local.values.display.name_Value.set(1);}}
        if (pitch == 53) {if(velocity==127){script.log("SMPTE/Beats");local.values.display.SMPTE_Beats.set(1);}}
    }
    
    //Is it a 'Function' button ?
    if (pitch >= 54 && pitch <= 61){
        var index = pitch-54;
        if (velocity==127){script.log("Function"+ (index+1)); local.values.functionnal.getChild("f"+(index+1)).set(1);}
    }
    
    //Is it a 'View' button ?
    if (pitch >= 62 && pitch <= 69){
        // Set new view value
        local.parameters.activeView.setData(pitch-62);
    }

    //Is it a 'Modify' button ?
    if (pitch >= 70 && pitch <= 73){
        if (pitch == 70) {if(velocity==127){script.log("Shift");local.values.modify.shift.set(1);}}
        if (pitch == 71) {if(velocity==127){script.log("Option");local.values.modify.option.set(1);}}
        if (pitch == 72) {if(velocity==127){script.log("Control");local.values.modify.control.set(1);}}
        if (pitch == 73) {if(velocity==127){script.log("Alt");local.values.modify.alt.set(1);}}
    }

    //Is it an 'Automation' button ?
    if (pitch >= 74 && pitch <= 79){
        if (pitch == 74) {if(velocity==127){script.log("Read/Off");local.values.automation.readOff.set(1);}}
        if (pitch == 75) {if(velocity==127){script.log("Write");local.values.automation.write.set(1);}}
        if (pitch == 76) {if(velocity==127){script.log("Trim");local.values.automation.trim.set(1);}}
        if (pitch == 77) {if(velocity==127){script.log("Touch");local.values.automation.touch.set(1);}}
        if (pitch == 78) {if(velocity==127){script.log("Latch");local.values.automation.latch.set(1);}}
        if (pitch == 79) {if(velocity==127){script.log("Group");local.values.automation.group.set(1);}}
    }

    //Is it an 'Utility' button ?
    if (pitch >= 80 && pitch <= 83){
        if (pitch == 80) {if(velocity==127){script.log("Save");local.values.utility.save.set(1);}}
        if (pitch == 81) {if(velocity==127){script.log("Undo");local.values.utility.undo.set(1);}}
        if (pitch == 82) {if(velocity==127){script.log("Cancel");local.values.utility.cancel.set(1);}}
        if (pitch == 83) {if(velocity==127){script.log("Enter");local.values.utility.enter.set(1);}}
    }

    //Is it a 'Transport' button?
    if (pitch >= 84 && pitch <= 95){
        if (pitch == 84) {if(velocity==127){script.log("Marker");local.values.transport.marker.set(1);}}
        if (pitch == 85) {if(velocity==127){script.log("Nudge");local.values.transport.nudge.set(1);}}
        if (pitch == 86) {if(velocity==127){script.log("Cycle");local.values.transport.cycle.set(1);}}
        if (pitch == 87) {if(velocity==127){script.log("Drop");local.values.transport.drop.set(1);}}
        if (pitch == 88) {if(velocity==127){script.log("Replace");local.values.transport.replace.set(1);}}
        if (pitch == 89) {if(velocity==127){script.log("Click");local.values.transport.click.set(1);}}
        if (pitch == 90) {if(velocity==127){script.log("Solo");local.values.transport.solo.set(1);}}
        if (pitch == 91) {if(velocity==127){script.log("Rewind");local.values.transport.rewind.set(1);}}
        if (pitch == 92) {if(velocity==127){script.log("Fast Forward");local.values.transport.forward.set(1);}}
        if (pitch == 93) {if(velocity==127){script.log("Stop");local.values.transport.stop.set(1);}}
        if (pitch == 94) {if(velocity==127){script.log("Play");local.values.transport.play.set(1);}}
        if (pitch == 95) {if(velocity==127){script.log("RecSet");local.values.transport.recSet.set(1);}}
    }

    //Is it a 'Arrow' button?
    if (pitch >= 96 && pitch <= 99){
        if (pitch == 96) {if(velocity==127){script.log("Up");local.values.misc.up.set(1);}}
        if (pitch == 97) {if(velocity==127){script.log("Down");local.values.misc.down.set(1);}}
        if (pitch == 98) {if(velocity==127){script.log("Left");local.values.misc.left.set(1);}}
        if (pitch == 99) {if(velocity==127){script.log("Right");local.values.misc.right.set(1);}}
    }

    //Is it a 'Misc' button?
    if (pitch >= 100 && pitch <= 101){
        if (pitch == 100) {if(velocity==127){script.log("Zoom");local.values.misc.zoom.set(1);}}
        if (pitch == 101) {if(velocity==127){script.log("Scrub");local.values.misc.scrub.set(1);}}
    }

    //Is it a fader touch?
    if (pitch >= 104 && pitch <= 111 && local.parameters.flashOnTouched.get()){
        var index = pitch-104;
        local.values.strips.getChild('Strip '+(index+1)).touch.set(true);
        local.values.strips.getChild('Strip '+(index+1)).select.set("flash");
    }

}

function noteOffEvent(channel, pitch, velocity)
{
    //Is it a fader touch release?
    if (pitch >= 104 && pitch <= 111){
        var index = pitch-104;
        //Release touched boolean
        local.values.strips.getChild('Strip '+(index+1)).touch.set(false);
        //If this strip is selected
        if(local.parameters.stripIndex.get()==index+1){
            //Set light to solid
            local.values.strips.getChild('Strip '+(index+1)).select.set("on");
        }else{
            //Set Light off
            local.values.strips.getChild('Strip '+(index+1)).select.set("off");
        }
    }

    //Is it a 'Push' button?
    if (pitch >= 32 && pitch <= 39){
        var index = pitch-32;
        if(velocity==0) {local.values.strips.getChild('Strip '+(index+1)).push.set(0);}
    }

    //Is it a 'Visual' button?
    if (pitch >= 50 && pitch <= 53){
        if (pitch == 50) {if(velocity==0){local.values.main.flip.set(0);}}
        if (pitch == 51) {if(velocity==0){local.values.views.globalView.set(0);}}
        if (pitch == 52) {if(velocity==0){local.values.display.name_Value.set(0);}}
        if (pitch == 53) {if(velocity==0){local.values.display.SMPTE_Beats.set(0);}}
    }
    //Is it a 'Function' button ?
    if (pitch >= 54 && pitch <= 61){
        var index = pitch-54;
        if (velocity==0){script.log("Function"+ (index+1)); local.values.functionnal.getChild("f"+(index+1)).set(0);}
    }

    //Is it a button ?
    if (pitch >= 70 && pitch <= 101){
        if (pitch == 70) {if(velocity==0){local.values.modify.shift.set(0);}}
        if (pitch == 71) {if(velocity==0){local.values.modify.option.set(0);}}
        if (pitch == 72) {if(velocity==0){local.values.modify.control.set(0);}}
        if (pitch == 73) {if(velocity==0){local.values.modify.alt.set(0);}}
        if (pitch == 74) {if(velocity==0){local.values.automation.readOff.set(0);}}
        if (pitch == 75) {if(velocity==0){local.values.automation.write.set(0);}}
        if (pitch == 76) {if(velocity==0){local.values.automation.trim.set(0);}}
        if (pitch == 77) {if(velocity==0){local.values.automation.touch.set(0);}}
        if (pitch == 78) {if(velocity==0){local.values.automation.latch.set(0);}}
        if (pitch == 79) {if(velocity==0){local.values.automation.group.set(0);}}
        if (pitch == 80) {if(velocity==0){local.values.utility.save.set(0);}}
        if (pitch == 81) {if(velocity==0){local.values.utility.undo.set(0);}}
        if (pitch == 82) {if(velocity==0){local.values.utility.cancel.set(0);}}
        if (pitch == 83) {if(velocity==0){local.values.utility.enter.set(0);}}
        if (pitch == 84) {if(velocity==0){local.values.transport.marker.set(0);}}
        if (pitch == 85) {if(velocity==0){local.values.transport.nudge.set(0);}}
        if (pitch == 86) {if(velocity==0){local.values.transport.cycle.set(0);}}
        if (pitch == 87) {if(velocity==0){local.values.transport.drop.set(0);}}
        if (pitch == 88) {if(velocity==0){local.values.transport.replace.set(0);}}
        if (pitch == 89) {if(velocity==0){local.values.transport.click.set(0);}}
        if (pitch == 90) {if(velocity==0){local.values.transport.solo.set(0);}}
        if (pitch == 91) {if(velocity==0){local.values.transport.rewind.set(0);}}
        if (pitch == 92) {if(velocity==0){local.values.transport.forward.set(0);}}
        if (pitch == 93) {if(velocity==0){local.values.transport.stop.set(0);}}
        if (pitch == 94) {if(velocity==0){local.values.transport.play.set(0);}}
        if (pitch == 95) {if(velocity==0){local.values.transport.recSet.set(0);}}
        if (pitch == 96) {if(velocity==0){local.values.misc.up.set(0);}}
        if (pitch == 97) {if(velocity==0){local.values.misc.down.set(0);}}
        if (pitch == 98) {if(velocity==0){local.values.misc.left.set(0);}}
        if (pitch == 99) {if(velocity==0){local.values.misc.right.set(0);}}
        if (pitch == 100) {if(velocity==0){local.values.misc.zoom.set(0);}}
        if (pitch == 101) {if(velocity==0){local.values.misc.scrub.set(0);}}
    }
}

//Upon receiving MIDI Control Change messzge
function ccEvent(channel, number, value)
{   
    //Is it encoder movement?
    if(channel==1 && number >= 16 && number <= 23){
        var index = number-16;
        //If SpinLeft
        if(value>64){
            //Subtract corrected value from rotaryValueue
            local.values.strips.getChild('Strip '+(index+1)).rotaryValue.set(local.values.strips.getChild('Strip '+(index+1)).rotaryValue.get()-((value-64)/256));
        }else{
            //Add value to rotaryValueue
            local.values.strips.getChild('Strip '+(index+1)).rotaryValue.set(local.values.strips.getChild('Strip '+(index+1)).rotaryValue.get()+(value/256));
        }
    }
}

//Upon receiving MIDI PitchWheel message (only fader values)
function pitchWheelEvent(channel,value){
    //Is Master fader?
    if(channel==9){
        local.values.main.mainFader.set(value/16383);
        local.sendPitchWheel(channel,value);
    }
    //It's a strip fader
    else{
        //Update strip module with new value
        local.values.strips.getChild('Strip '+channel).faderValue.set(value/16383);
    }
}

//Upon receiving System Exclusive Message
function sysExEvent(data)
{
    //script.log("Sysex Message received, "+data.length+" bytes :");
}
