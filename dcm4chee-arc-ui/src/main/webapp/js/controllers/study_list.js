"use strict";

myApp.controller('StudyListCtrl', function ($scope, $window, $http, QidoService, StudiesService, cfpLoadingBar, $modalities, $compile, DeviceService,  $filter, $templateRequest, $timeout) {
    $scope.logoutUrl = myApp.logoutUrl();
    $scope.patients = [];
//   $scope.studies = [];
    // $scope.allhidden = false; 
    $scope.opendropdown = false;
    $scope.patientmode = true;
    $scope.morePatients;
    $scope.moreStudies;
    $scope.limit = 20;
    $scope.aes;
    $scope.trashaktive = false;
    $scope.aet = null;
    $scope.exporters;
    $scope.exporterID = null;
    $scope.attributeFilters = {};
    $scope.rjnotes;
    $scope.keepRejectionNote = false;
    $scope.rjnote = null;
    $scope.advancedConfig = false;
    $scope.showModalitySelector = false;
    $scope.filter = { orderby: "PatientName" };
    $scope.studyDate = { from: StudiesService.getTodayDate(), to: StudiesService.getTodayDate(),toObject:new Date(),fromObject:new Date()};
    $scope.studyTime = { from: '', to: ''};
    $scope.format = "yyyyMMdd";
    $scope.format2 = "yyyy-MM-dd";
    $scope.modalities = $modalities;
    $scope.rjcode = null;
    $scope.options = {};
    $scope.options["genders"] = [
            {
                "vr": "CS",
                "Value":["F"],
                "title":"Female"
            },
            {
                "vr": "CS",
                "Value":["M"],
                "title":"Male"
            },
            {
                "vr": "CS",
                "Value":["O"],
                "title":"Other"
            }
    ];
    $scope.orderby = [
        {
            value:"PatientName",
            label:"<label>Patient</label><span class=\"glyphicon glyphicon-sort-by-alphabet\"></span>"
        },
        {
            value:"-PatientName",
            label:"<label>Patient</label><span class=\"orderbynamedesc\"></span>"
        },
        {

            value:"StudyDate,StudyTime",
            label:"<label>Study</label><span class=\"orderbydateasc\"></span>"
        },
        {
            value:"-StudyDate,-StudyTime",
            label:"<label>Study</label><span class=\"orderbydatedesc\"></span>"
        },
        {
            value:"PatientName,StudyDate,StudyTime",
            label:"<label>Study</label><span class=\"glyphicon glyphicon-sort-by-alphabet\"></span><span class=\"orderbydateasc\"></span>"
        },
        {
            value:"-PatientName,StudyDate,StudyTime",
            label:"<label>Study</label><span class=\"orderbynamedesc\"></span><span class=\"orderbydateasc\"></span>"
        },
        {
            value:"PatientName,-StudyDate,-StudyTime",
            label:"<label>Study</label><span class=\"glyphicon glyphicon-sort-by-alphabet\"></span><span class=\"orderbydatedesc\"></span>"
        },
        {
            value:"-PatientName,-StudyDate,-StudyTime",
            label:"<label>Study</label><span class=\"orderbynamedesc\"></span><span class=\"orderbydatedesc\"></span>"
        }
    ];
    $scope.setTrash = function(ae){
        if(ae.dcmHideNotRejectedInstances === true){
            if($scope.rjcode === null){
                $http.get("../reject?dcmRevokeRejection=true").then(function (res) {
                    $scope.rjcode = res.data[0];
                });
            }
            $scope.trashaktive = true;
        }else{
            $scope.trashaktive = false;
        }
    };
    $scope.$watchCollection('patients', function(newValue, oldValue){
        StudiesService.trim($scope);
    });
    // $scope.trim = function(selector){
    //     StudiesService.trim(selector);
    // };
    $scope.addFileAttribute = function(instance){
        var id      = '#file-attribute-list-'+(instance.attrs['00080018'].Value[0]).replace(/\./g, '');
        if(angular.element(id).find("*").length < 1){
            cfpLoadingBar.start();
            var html    = '<file-attribute-list studyuid="'+ instance.wadoQueryParams.studyUID +'" seriesuid="'+ instance.wadoQueryParams.seriesUID +'"  objectuid="'+ instance.wadoQueryParams.objectUID+ '"></file-attribute-list>';
            // console.log("html=",html);
            cfpLoadingBar.set(cfpLoadingBar.status()+(0.2));
            angular.element(id).html(
                $compile(html)($scope)
            );
        }
    };
    $(".logo").unbind("click").bind("click",function(){
        console.log("logo click");
        var html =  '<div class="info-block">'
            html +=         '<div class="head">'
            html +=             '<h1>J4Care</h1>'
            html +=             '<h3>SMooTH Archive</h3>'
            html +=             '<h4>Version 5.3.1</h4>'
            html +=         '</div>'
            html +=         '<div class="content">'
            html +=             '<p><b>J4Care GmbH</b><br/>Enzersdorfer Strasse 7<br/>A-2340 Mödling</p>'
            html +=         '</div>'
            html +=         '<div class="pre_footer">'
            html +=             '<span>2009</span>'
            html +=         '</div>'
            html +=         '<div class="footer">'
            html +=             '<div class="footer_left col-sm-6">'
            html +=             '</div>'
            html +=             '<div class="footer_right col-sm-6">'
            html +=             '<span>0408</span>'
            html +=             '</div>'
            html +=         '</div>'
            html +=     '</div>'
        vex.dialog.alert({
            // input:'<img src="img/kenn.jpg">',
            input:html,
            className:"vex-theme-os info-dialog"
        });
    });
    var modifyPatient = function(patient, mode, patientkey){
        cfpLoadingBar.start();
        var editpatient     = {};
        angular.copy(patient, editpatient);
        if(mode === "edit"){
            angular.forEach(editpatient.attrs,function(value, index) {
                var checkValue = "";    
                if(value.Value && value.Value.length){
                    checkValue = value.Value.join("");
                }
                if(!(value.Value && checkValue != "")){
                    delete editpatient.attrs[index];
                }
                if(index === "00100040" && editpatient.attrs[index] && editpatient.attrs[index].Value && editpatient.attrs[index].Value[0]){
                    editpatient.attrs[index].Value[0] = editpatient.attrs[index].Value[0].toUpperCase();
                }
            });
        }

        $scope.editpatient  = editpatient;
        editpatient         = {};
        $scope.lastPressedCode = 0;

        $scope.removeAttr = function(attrcode){
            switch(arguments.length) {
                case 2:
                    if($scope.editpatient.attrs[arguments[0]].Value.length === 1){
                        delete  $scope.editpatient.attrs[arguments[0]];
                    }else{
                        $scope.editpatient.attrs[arguments[0]].Value.splice(arguments[1], 1);
                    }
                break;
                default:
                    delete  $scope.editpatient.attrs[arguments[0]];
                break;
            }
        };
        $http.get('iod/patient.iod.json',{ cache: true}).then(function (res) {
            var dropdown                = StudiesService.getArrayFromIod(res);
            res.data = StudiesService.replaceKeyInJson(res.data, "items", "Value");
            $templateRequest('templates/edit_patient.html').then(function(tpl) {
            $scope.dropdown             = dropdown;
            $scope.DCM4CHE              = DCM4CHE;
            $scope.addPatientAttribut   = "";
            $scope.opendropdown         = false;
            var html                    = $compile(tpl)($scope);
            var $vex = vex.dialog.open({
              message: 'Edit patient',
              input: html,
              className:"vex-theme-os edit-patient",
              overlayClosesOnClick: false,
              escapeButtonCloses: false,
              afterOpen: function($vexContent) {
                cfpLoadingBar.complete();
                setTimeout(function(){
                    $(".editform .schema-form-fieldset > legend").append('<span class="glyphicon glyphicon-triangle-right"></span>');
                    $(".editform .schema-form-fieldset > legend").bind("click",function(){
                        $(this).siblings("sf-decorator").toggle();
                        var icon = $(this).find(".glyphicon");
                        if(icon.hasClass('glyphicon-triangle-right')){
                            icon.removeClass('glyphicon-triangle-right').addClass('glyphicon-triangle-bottom');
                        }else{
                            icon.removeClass('glyphicon-triangle-bottom').addClass('glyphicon-triangle-right');
                        }
                    });
                    //Click event handling
                    $scope.addAttribute = function(attrcode){
                        if($scope.editpatient.attrs[attrcode] != undefined){
                            if(res.data[attrcode].multi){
                                $timeout(function() {
                                    $scope.$apply(function(){
                                        // $scope.editpatient.attrs[attrcode]  = res.data[attrcode];
                                        $scope.editpatient.attrs[attrcode]["Value"].push("");
                                        $scope.addPatientAttribut           = "";
                                        $scope.opendropdown                 = false;
                                    });
                                });
                            }else{
                                DeviceService.msg($scope, {
                                        "title": "Warning",
                                        "text": "Attribute already exists!",
                                        "status": "warning"
                                });
                            }
                        }else{
                            $timeout(function() {
                                $scope.$apply(function(){
                                    $scope.editpatient.attrs[attrcode]  = res.data[attrcode];
                                });
                            });
                        }
                    };
                    $(".addPatientAttribut").bind("keydown",function(e){
                        $scope.opendropdown = true;
                        var code = (e.keyCode ? e.keyCode : e.which);
                        $scope.lastPressedCode = code;
                        if(code === 13){
                            var filter = $filter("filter");
                            var filtered = filter($scope.dropdown, $scope.addPatientAttribut);
                            if(filtered){
                                $scope.opendropdown = true;
                            }
                            if($(".dropdown_element.selected").length){
                                var attrcode = $(".dropdown_element.selected").attr("name"); 
                            }else{
                                var attrcode = filtered[0].code;
                            }
                            if($scope.editpatient.attrs[attrcode] != undefined){
                                if(res.data[attrcode].multi){
                                    $timeout(function() {
                                        $scope.$apply(function(){
                                            $scope.editpatient.attrs[attrcode]["Value"].push("");
                                            $scope.addPatientAttribut           = "";
                                            $scope.opendropdown                 = false;
                                        });
                                    });
                                }else{
                                    DeviceService.msg($scope, {
                                        "title": "Warning",
                                        "text": "Attribute already exists!",
                                        "status": "warning"
                                    });
                                }
                            }else{
                                $timeout(function() {
                                    $scope.$apply(function(){
                                        $scope.editpatient.attrs[attrcode]  = res.data[attrcode];
                                    });
                                });
                            }
                            setTimeout(function(){
                                $scope.lastPressedCode = 0;
                            },1000);
                        }
                        //Arrow down pressed
                        if(code === 40){
                            $scope.$apply(function(){
                                $scope.opendropdown = true;
                            });
                            if(!$(".dropdown_element.selected").length){
                                $(".dropdown_element").first().addClass('selected');
                            }else{
                                if($(".dropdown_element.selected").next().length){
                                    $(".dropdown_element.selected").removeClass('selected').next().addClass('selected');
                                }else{
                                    $(".dropdown_element.selected").removeClass('selected');
                                    $(".dropdown_element").first().addClass('selected');
                                }
                            }

                                if($(".dropdown_element.selected").position()){
                                    $('.dropdown').scrollTop($('.dropdown').scrollTop() + $(".dropdown_element.selected").position().top - $('.dropdown').height()/2 + $(".dropdown_element.selected").height()/2);
                                }
                        }
                        //Arrow up pressed
                        if(code === 38){
                            $scope.$apply(function(){
                                $scope.opendropdown = true;
                            });
                            if(!$(".dropdown_element.selected").length){
                                $(".dropdown_element").prev().addClass('selected');
                            }else{
                                if($(".dropdown_element.selected").index() === 0){
                                    $(".dropdown_element.selected").removeClass('selected');
                                    $(".dropdown_element").last().addClass('selected');
                                }else{
                                    $(".dropdown_element.selected").removeClass('selected').prev().addClass('selected');
                                }
                            }
                            $('.dropdown').scrollTop($('.dropdown').scrollTop() + $(".dropdown_element.selected").position().top - $('.dropdown').height()/2 + $(".dropdown_element.selected").height()/2);
                        }
                        if(code === 27){
                            $scope.$apply(function(){
                                $scope.opendropdown = false;
                            });
                        }
                    });
                    $(".editform .schema-form-fieldset > sf-decorator").hide();
                },1000);//TODO make it dynamic
              },
                onSubmit: function(e) {
                    //Prevent submit/close if ENTER was clicked
                    if($scope.lastPressedCode === 13){
                        e.preventDefault();
                    }else{
                        $vex.data().vex.callback();
                    }
                  },
                buttons: [
                    $.extend({}, vex.dialog.buttons.YES, {
                      text: 'Save'
                    }), $.extend({}, vex.dialog.buttons.NO, {
                      text: 'Cancel'
                    })
                ],
                callback: function(data) {
                    cfpLoadingBar.start();
                    if (data === false) {
                        cfpLoadingBar.complete();

                        StudiesService.clearPatientObject($scope.editpatient.attrs);
                        return console.log('Cancelled');
                    }else{
                        StudiesService.clearPatientObject($scope.editpatient.attrs);
                        if($scope.editpatient.attrs["00100020"].Value[0]){
                            angular.forEach($scope.editpatient.attrs, function(m, i){
                                if(res.data[i].vr != "SQ" && m.Value && m.Value.length === 1 && m.Value[0] === ""){
                                    delete $scope.editpatient.attrs[i];
                                }
                            });
                            $http.put(
                                "../aets/"+$scope.aet+"/rs/patients?PatientID="+$scope.editpatient.attrs["00100020"].Value[0],
                                $scope.editpatient.attrs
                            ).then(function successCallback(response) {
                                if(mode === "edit"){
                                    //Update changes on the patient list
                                    angular.forEach(patient.attrs, function(m, i){
                                        if($scope.editpatient.attrs[i]){
                                            patient.attrs[i] = $scope.editpatient.attrs[i];
                                        }
                                    });
                                    //Force rerendering the directive attribute-list
                                    var id = "#"+$scope.editpatient.attrs["00100020"].Value;
                                    var attribute = $compile('<attribute-list attrs="patients['+patientkey+'].attrs"></attribute-list>')($scope);
                                    $(id).html(attribute);
                                }else{
                                    if($scope.patientmode){
                                        $timeout(function() {
                                            angular.element("#querypatients").trigger('click');
                                        }, 0);
                                        // $scope.queryPatients(0);
                                    }else{
                                        // $scope.queryStudies(0);
                                        $timeout(function() {
                                            angular.element("#querystudies").trigger('click');
                                        }, 0);
                                    }
                                }
                                DeviceService.msg($scope, {
                                    "title": "Info",
                                    "text": "Patient saved successfully!",
                                    "status": "info"
                                });
                            }, function errorCallback(response) {
                                DeviceService.msg($scope, {
                                    "title": "Error",
                                    "text": "Error saving patient!",
                                    "status": "error"
                                });
                            });
                        }else{
                            DeviceService.msg($scope, {
                                "title": "Error",
                                "text": "Patient ID is required!",
                                "status": "error"
                            });
                        }
                    }
                    vex.close($vex.data().vex.id);
                }
            });
        });
        });
    };
    $scope.editPatient = function(patient, patientkey){
        modifyPatient(patient, "edit", patientkey);
    };
    $scope.createPatient = function(patient){
        var patient = {
            "attrs":{
                "00100010": { "vr": "PN", "Value":[""]},
                "00100020": { "vr": "LO", "Value":[""]},
                "00100021": { "vr": "LO", "Value":[""]},
                "00100030": { "vr": "DA", "Value":[""]},
                "00100040": { "vr": "CS", "Value":[""]}
            }
        };
        modifyPatient(patient, "create");
    };

    $scope.clearForm = function(){
        angular.forEach($scope.filter,function(m,i){
            console.log("i",i);
            if(i !="orderby"){
                $scope.filter[i] = "";
            }
        });
        angular.element(".single_clear").hide();
        $scope.studyDate.fromObject = null;
        $scope.studyDate.toObject = null;
        $scope.studyDate.from = "";
        $scope.studyDate.to = "";
        $scope.studyTime.fromObject = null;
        $scope.studyTime.toObject = null;
        $scope.studyTime.from = "";
        $scope.studyTime.to = "";
    };
    $scope.selectModality = function(key){
        $scope.filter.ModalitiesInStudy = key;
        angular.element(".Modality").show();
        $scope.showModalitySelector=false;
    };
    $scope.checkKeyModality = function(keyEvent) {
        if (keyEvent.which === 13){
            $scope.showModalitySelector=false;
        }
    };
    $scope.studyDateFrom = {
        opened: false
    };
    $scope.studyDateTo = {
        opened: false
    };
    $scope.rejectedBefore = {
        opened:false
    };
    $scope.toggleAttributs = function(instance,art){
        if(art==="fileattributs"){
            instance.showAttributes = false;
            instance.showFileAttributes = !instance.showFileAttributes;
        }else{
            instance.showAttributes = !instance.showAttributes;
            instance.showFileAttributes = false;
        }
    };
    //Close modaity selctor when you click some where else but on the selector
    angular.element("html").bind("click",function(e){
        if(!(e.target.id === "Modality")){
            if(angular.element(e.target).closest('.modality_selector').length === 0 && angular.element(e.target).parent('.modality_selector').length === 0 && $scope.showModalitySelector){
                $scope.$apply(function(){
                    $scope.showModalitySelector = false;
                });
            }
        }
        if(e.target.id != "addPatientAttribut"){
            $scope.$apply(function(){
                $scope.opendropdown         = false;
            });
        }

    });

    $scope.addEffect = function(direction){
        var element = angular.element(".div-table");
            element.removeClass('fadeInRight').removeClass('fadeInLeft');
            setTimeout(function(){
                if(direction === "left"){
                    element.addClass('animated').addClass("fadeOutRight");
                }
                if(direction === "right"){
                    element.addClass('animated').addClass("fadeOutLeft");
                }
            },1);
            setTimeout(function(){
                element.removeClass('fadeOutRight').removeClass('fadeOutLeft');
                if(direction === "left"){
                    element.addClass("fadeInLeft").removeClass('animated');
                }
                if(direction === "right"){
                    element.addClass("fadeInRight").removeClass('animated');
                }
            },301);
    };
    $scope.studyDateFromOpen = function() {
        cfpLoadingBar.start();
        $scope.studyDateFrom.opened = true;
        var watchPicker = setInterval(function(){ 
                                //uib-datepicker-popup uib-close
            if(angular.element(".uib-datepicker-popup .uib-close").length > 0){
                clearInterval(watchPicker);
                cfpLoadingBar.complete();

            }
        }, 10);
    };
    $scope.studyDateToOpen = function() {
        cfpLoadingBar.start();
        $scope.studyDateTo.opened = true;
        var watchPicker = setInterval(function(){ 
            if(angular.element(".uib-datepicker-popup .uib-close").length > 0){
                clearInterval(watchPicker);
                cfpLoadingBar.complete();
            }
        }, 10);
    };
    $scope.clockpicker = {
          twelvehour: false,
          autoclose : true,
          align :'left',
          nativeOnMobile: true,
          afterDone: function() {
                    cfpLoadingBar.start();
                    StudiesService.updateTime($scope.studyTime);
          }
    };

    $scope.$watchCollection('studyDate', function(newValue, oldValue){
        cfpLoadingBar.start();
        if(newValue.fromObject != oldValue.fromObject){
            if($scope.studyDate.fromObject){
                angular.element(".StudyDateFrom").show();
            }else{
                angular.element(".StudyDateFrom").hide();
            }
            StudiesService.updateFromDate($scope.studyDate);
        }
        if(newValue.toObject != oldValue.toObject){
            cfpLoadingBar.start();
            if($scope.studyDate.toObject){
                angular.element(".StudyDateTo").show();
            }else{
                angular.element(".StudyDateTo").hide();
            }
            StudiesService.updateToDate($scope.studyDate);
        }
        cfpLoadingBar.complete();
    });

    $scope.queryPatients = function(offset) {
        cfpLoadingBar.start();
        if (offset < 0) offset = 0;
        QidoService.queryPatients(
            rsURL(),
            createQueryParams(offset, $scope.limit+1, createPatientFilterParams())
        ).then(function (res) {
            $scope.morePatients = undefined;
            $scope.moreStudies = undefined;
            if(res.data != ""){
                $scope.patients = res.data.map(function (attrs, index) {
                    return {
                        moreStudies: false,
                        offset: offset + index,
                        attrs: attrs,
                        studies: null,
                        showAttributes: false
                    };
                });
                if ($scope.morePatients = ($scope.patients.length > $scope.limit)) {
                    $scope.patients.pop();
                }
            } else {
                $scope.patients = [];
                DeviceService.msg($scope, {
                    "title": "Info",
                    "text": "No matching Patients found!",
                    "status": "info"
                });
            }
            // var state = ($scope.allhidden) ? "hide" : "show";
            // setTimeout(function(){
            //     togglePatientsHelper(state);
            // }, 1000);
            cfpLoadingBar.complete();
        });
    };
    $scope.queryStudies = function(offset) {

        cfpLoadingBar.start();
        if (offset < 0 || offset === undefined) offset = 0;
        QidoService.queryStudies(
            rsURL(),
            createQueryParams(offset, $scope.limit+1, createStudyFilterParams())
        ).then(function (res) {
            $scope.patients = [];
 //           $scope.studies = [];
            $scope.morePatients = undefined;
            $scope.moreStudies = undefined;
            if(res.data != ""){
                var pat, study, patAttrs, tags = $scope.attributeFilters.Patient.dcmTag;
                res.data.forEach(function (studyAttrs, index) {
                    patAttrs = {};
                    extractAttrs(studyAttrs, tags, patAttrs);
                    if (!(pat && angular.equals(pat.attrs, patAttrs))) {
                        pat = {
                            attrs: patAttrs,
                            studies: [],
                            showAttributes: false
                        };
                        // $scope.$apply(function () {
                            $scope.patients.push(pat);
                        // });
                    }
                    study = {
                        patient: pat,
                        offset: offset + index,
                        moreSeries: false,
                        attrs: studyAttrs,
                        series: null,
                        showAttributes: false,
                        fromAllStudies:false
                    };
                    pat.studies.push(study);
 //                   $scope.studies.push(study); //sollte weg kommen
                });
                if ($scope.moreStudies = (res.data.length > $scope.limit)) {
                    pat.studies.pop();
                    if (pat.studies.length === 0)
                        $scope.patients.pop();
                    // $scope.studies.pop();
                }
            } else {
                DeviceService.msg($scope, {
                    "title": "Info",
                    "text": "No matching Studies found!",
                    "status": "info"
                });
            }
            // setTimeout(function(){
            //     togglePatientsHelper("hide");
            // }, 1000);
            cfpLoadingBar.complete();
        });
    };
    $scope.queryAllStudiesOfPatient = function(patient, offset) {
        cfpLoadingBar.start();
        if (offset < 0) offset = 0;
        QidoService.queryStudies(
            rsURL(),
            createQueryParams(offset, $scope.limit+1, {
                PatientID: valueOf(patient.attrs['00100020']),
                IssuerOfPatientID: valueOf(patient.attrs['00100021']),
                orderby: $scope.filter.orderby !== "StudyDate,StudyTime" ? "-StudyDate,-StudyTime" : $scope.filter.orderby
            })
        ).then(function (res) {
            if(res.data.length > 0){

                patient.studies = res.data.map(function (attrs, index) {
                    return {
                        patient: patient,
                        offset: offset + index,
                        moreSeries: false,
                        attrs: attrs,
                        series: null,
                        showAttributes: false,
                        fromAllStudies:true
                    };
                });
                if (patient.moreStudies = (patient.studies.length > $scope.limit)) {
                    patient.studies.pop();
                }
                StudiesService.trim($scope);
                console.log("patient",patient);
            }else{
                DeviceService.msg($scope, {
                    "title": "Info",
                    "text": "No matching Studies found!",
                    "status": "info"
                });
            }
            cfpLoadingBar.complete();
        });
    };
    $scope.querySeries = function(study, offset) {
         cfpLoadingBar.start();
        if (offset < 0) offset = 0;
        QidoService.querySeries(
            rsURL(),
            study.attrs['0020000D'].Value[0],
            createQueryParams(offset, $scope.limit+1, { orderby: 'SeriesNumber'})
        ).then(function (res) {
            study.series = res.data.map(function (attrs, index) {
                return {
                        study: study,
                        offset: offset + index,
                        moreInstances: false,
                        attrs: attrs,
                        instances: null,
                        showAttributes: false
                };
            });
            if (study.moreSeries = (study.series.length > $scope.limit)) {
                study.series.pop();
            }
            cfpLoadingBar.complete();
            StudiesService.trim($scope);
        });
    };
    $scope.queryInstances = function (series, offset) {
         cfpLoadingBar.start();
        if (offset < 0) offset = 0;
        QidoService.queryInstances(
            rsURL(),
            series.attrs['0020000D'].Value[0],
            series.attrs['0020000E'].Value[0],
            createQueryParams(offset, $scope.limit+1, { orderby: 'InstanceNumber'})
        )
        .then(function (res) {
            series.instances = res.data.map(function(attrs, index) {
                var numberOfFrames = valueOf(attrs['00280008']),
                    gspsQueryParams = createGSPSQueryParams(attrs),
                    video = isVideo(attrs);
                    cfpLoadingBar.complete();
                return {
                    series: series,
                    offset: offset + index,
                    attrs: attrs,
                    showAttributes: false,
                    showFileAttributes:false,
                    wadoQueryParams: {
                        studyUID: attrs['0020000D'].Value[0],
                        seriesUID: attrs['0020000E'].Value[0],
                        objectUID: attrs['00080018'].Value[0]
                    },
                    video: video,
                    numberOfFrames: numberOfFrames,
                    gspsQueryParams: gspsQueryParams,
                    views: createArray(video || numberOfFrames || gspsQueryParams.length || 1),
                    view: 1
                };
            });
            if (series.moreInstances = (series.instances.length > $scope.limit)) {
                series.instances.pop();
            }
            StudiesService.trim($scope);
            cfpLoadingBar.complete();
        });
    };
    $scope.exportStudy = function(study) {
            var html = $compile('<select id="exporter" ng-model="exporterID" class="col-md-12"><option ng-repeat="exporter in exporters" title="{{exporter.description}}">{{exporter.id}}</option></select>')($scope);
            vex.dialog.open({
              message: 'Select Exporter',
              input: html,
              buttons: [
                $.extend({}, vex.dialog.buttons.YES, {
                  text: 'Export'
                }), $.extend({}, vex.dialog.buttons.NO, {
                  text: 'Cancel'
                })
              ],
              callback: function(data) {
                if (data === false) {
                  return console.log('Cancelled');
                }else{
                    $http.get(studyURL(study.attrs) + '/export/' + $scope.exporterID);
                }
              }
            });
    };
    $scope.exportSeries = function(series) {
            var html = $compile('<select id="exporter" ng-model="exporterID" class="col-md-12"><option ng-repeat="exporter in exporters" title="{{exporter.description}}">{{exporter.id}}</option></select>')($scope);
            vex.dialog.open({
              message: 'Select Exporter',
              input: html,
              buttons: [
                $.extend({}, vex.dialog.buttons.YES, {
                  text: 'Export'
                }), $.extend({}, vex.dialog.buttons.NO, {
                  text: 'Cancel'
                })
              ],
              callback: function(data) {
                if (data === false) {
                  return console.log('Cancelled');
                }else{
                    $http.get(seriesURL(series.attrs) + '/export/' + $scope.exporterID);
                }
              }
            });
    };
    $scope.exportInstance = function(instance) {
            var html = $compile('<select id="exporter" ng-model="exporterID" class="col-md-12"><option ng-repeat="exporter in exporters" title="{{exporter.description}}">{{exporter.id}}</option></select>')($scope);
            vex.dialog.open({
              message: 'Select Exporter',
              input: html,
              buttons: [
                $.extend({}, vex.dialog.buttons.YES, {
                  text: 'Export'
                }), $.extend({}, vex.dialog.buttons.NO, {
                  text: 'Cancel'
                })
              ],
              callback: function(data) {
                if (data === false) {
                  return console.log('Cancelled');
                }else{
                    $http.get(instanceURL(instance.attrs) + '/export/' + $scope.exporterID);
                }
              }
            });

    };
    $scope.rejectStudy = function(study) {
        if($scope.trashaktive){
            $http.get(studyURL(study.attrs) + '/reject/' + $scope.rjcode.codeValue + "^"+ $scope.rjcode.codingSchemeDesignator).then(function (res) {
                // $scope.queryStudies($scope.studies[0].offset);
                $scope.queryStudies($scope.patients[0].offset);
            });
        }else{
            var html = $compile('<select id="reject" ng-model="reject" name="reject" class="col-md-9"><option ng-repeat="rjn in rjnotes" title="{{rjn.codeMeaning}}" value="{{rjn.codeValue}}^{{rjn.codingSchemeDesignator}}">{{rjn.label}}</option></select>')($scope);
            vex.dialog.open({
              message: 'Select rejected type',
              input: html,
              buttons: [
                $.extend({}, vex.dialog.buttons.YES, {
                  text: 'Reject'
                }), $.extend({}, vex.dialog.buttons.NO, {
                  text: 'Cancel'
                })
              ],
              callback: function(data) {
                if (data === false) {
                    console.log("$scope.patients",$scope.patients);
                  return console.log('Cancelled');
                }else{
                    $http.get(studyURL(study.attrs) + '/reject/' + $scope.reject).then(function (res) {
                        // $scope.queryStudies($scope.studies[0].offset);
                        $scope.queryStudies($scope.patients[0].offset);
                    });
                }
              }
            });
        }
    };
    $scope.rejectSeries = function(series) {
        if($scope.trashaktive){
            $http.get(seriesURL(series.attrs) + '/reject/' + $scope.rjcode.codeValue + "^"+ $scope.rjcode.codingSchemeDesignator).then(function (res) {
                // $scope.queryStudies($scope.studies[0].offset);
                $scope.queryStudies($scope.patients[0].offset);
            });
        }else{
            var html = $compile('<select id="reject" ng-model="reject" name="reject" class="col-md-9"><option ng-repeat="rjn in rjnotes" title="{{rjn.codeMeaning}}" value="{{rjn.codeValue}}^{{rjn.codingSchemeDesignator}}">{{rjn.label}}</option></select>')($scope);
            vex.dialog.open({
              message: 'Select rejected type',
              input: html,
              buttons: [
                $.extend({}, vex.dialog.buttons.YES, {
                  text: 'Reject'
                }), $.extend({}, vex.dialog.buttons.NO, {
                  text: 'Cancel'
                })
              ],
              callback: function(data) {
                if (data === false) {
                  return console.log('Cancelled');
                }else{
                    $http.get(seriesURL(series.attrs) + '/reject/' + $scope.reject).then(function (res) {
                        $scope.querySeries(series.study, series.study.series[0].offset);
                    });
                }
              }
            });
        }
    };
    $scope.rejectInstance = function(instance) {
        if($scope.trashaktive){
            $http.get(instanceURL(instance.attrs) + '/reject/' + $scope.rjcode.codeValue + "^"+ $scope.rjcode.codingSchemeDesignator).then(function (res) {
                // $scope.queryStudies($scope.studies[0].offset);
                $scope.queryStudies($scope.patients[0].offset);
            });
        }else{
            var html = $compile('<select id="reject" ng-model="reject" name="reject" class="col-md-9"><option ng-repeat="rjn in rjnotes" title="{{rjn.codeMeaning}}" value="{{rjn.codeValue}}^{{rjn.codingSchemeDesignator}}">{{rjn.label}}</option></select>')($scope);
            vex.dialog.open({
              message: 'Select rejected type',
              input: html,
              buttons: [
                $.extend({}, vex.dialog.buttons.YES, {
                  text: 'Reject'
                }), $.extend({}, vex.dialog.buttons.NO, {
                  text: 'Cancel'
                })
              ],
              callback: function(data) {
                if (data === false) {
                  return console.log('Cancelled');
                }else{
                    $http.get(instanceURL(instance.attrs) + '/reject/' + $scope.reject).then(function (res) {
                        $scope.queryInstances(instance.series, instance.series.instances[0].offset);
                    });
                }
              }
            });
        }
    };
    $scope.rejectedBeforeOpen = function(){
        cfpLoadingBar.start();
        $scope.rejectedBefore.opened = true;
        var watchPicker = setInterval(function(){ 
            if(angular.element(".uib-datepicker-popup .uib-close").length > 0){
                clearInterval(watchPicker);
                cfpLoadingBar.complete();
            }
        }, 10);
    }
    $scope.deleteRejectedInstances = function() {
        var html = $compile(
            '<div class="form-group">'+
                '<label>Delete instances with rejected type</label>'+
                '<select id="reject" ng-model="reject" name="reject" class="form-control">'+
                    '<option ng-repeat="rjn in rjnotes" title="{{rjn.codeMeaning}}" value="{{rjn.codeValue}}^{{rjn.codingSchemeDesignator}}">{{rjn.label}}</option>'+
                '</select>'+
            '</div>'+
            '<div class="form-group">'+
                '<label>Maximum reject date of instances to delete</label>'+
                '<input ng-model="rejectedBefore.date" autocomplete="off" class="form-control" ng-click="rejectedBeforeOpen()" placeholder="Delete all instances before this date" is-open="rejectedBefore.opened" id="rejectedBefore" title="Delete all instances before this date" type="text" uib-datepicker-popup="{{format2}}" close-text="Close"/>'+
            '</div>'+
            '<div class="checkbox">'+
                '<label>'+
                    '<input type="checkbox" name="keepRejectionNote" ng-model="keepRejectionNote" />'+
                    'if checked, keep rejection note instances - only delete rejected instances'+
                '</label>'+
            '</div>')($scope);
        vex.dialog.open({
          message: 'Delete instances that are in trash',
          input: html,
          className:"vex-theme-os deleterejectedinstances",
          buttons: [
            $.extend({}, vex.dialog.buttons.YES, {
              text: 'Delete all',
              className: "btn-danger btn"
            }), $.extend({}, vex.dialog.buttons.NO, {
              text: 'Cancel'
            })
          ],
          callback: function(data) {
            cfpLoadingBar.start();
            if (data === false) {
              cfpLoadingBar.complete();
              return console.log('Cancelled');
            }else{
                $http.delete('../reject/' + $scope.reject,{params: StudiesService.getParams($scope)}).then(function (res) {
                    cfpLoadingBar.complete();
                });
            }
          }
        });
    };
    $scope.downloadURL = function (inst, transferSyntax) {
        var exQueryParams = { contentType: 'application/dicom' };
        if (transferSyntax)
            exQueryParams.transferSyntax = transferSyntax;
        return wadoURL(inst.wadoQueryParams, exQueryParams);
    };
    $scope.viewInstance = function (inst) {
        $window.open(renderURL(inst));
    };
    $scope.studyRowspan = function(study) {
        var span = study.showAttributes ? 2 : 1;
        return study.series
            ? study.series.reduce(
                function(sum, series) {
                    return sum + $scope.seriesRowspan(series);
                },
                span+1)
            : span;
    };
    $scope.seriesRowspan = function(series) {
        var span = series.showAttributes ? 2 : 1;
        return series.instances
            ? series.instances.reduce(
                function (sum, instance) {
                    return sum + $scope.instanceRowspan(instance);
                },
                span + 1)
            : span;
    };
    $scope.instanceRowspan = function(instance) {
        return instance.showAttributes ? 2 : 1;
    };
    function rsURL() {
        return "../aets/" + $scope.aet + "/rs";
    }
    function studyURL(attrs) {
        return rsURL() + "/studies/" + attrs['0020000D'].Value[0];
    }
    function seriesURL(attrs) {
        return studyURL(attrs) + "/series/" + attrs['0020000E'].Value[0];
    }
    function instanceURL(attrs) {
        return seriesURL(attrs) + "/instances/" + attrs['00080018'].Value[0];
    }
    function createPatientFilterParams() {
        return {
            PatientName: $scope.filter.PatientName,
            PatientID: $scope.filter.PatientID,
            IssuerOfPatientID: $scope.filter.IssuerOfPatientID,
            fuzzymatching: $scope.filter.fuzzymatching,
            orderby: $scope.filter.orderby !== "-PatientName" ? "PatientName" :  $scope.filter.orderby
        };
    }
    function createStudyFilterParams() {
        var filter = angular.extend({}, $scope.filter);
        appendFilter(filter, "StudyDate", $scope.studyDate, /-/g);
        appendFilter(filter, "StudyTime", $scope.studyTime, /:/g);
        return filter;
    }
    function appendFilter(filter, key, range, regex) {
        var value = range.from.replace(regex, '');
        if (range.to !== range.from)
            value += '-' + range.to.replace(regex, '');
        if (value.length)
            filter[key] = value;
    }
    function createQueryParams(offset, limit, filter) {
        var params = {
            includefield: 'all',
            offset: offset,
            limit: limit
        };
        angular.forEach(filter, function(value, key) {
            if (value)
                params[key] = value;
        }, params);
        return params;
    }
    function renderURL(inst) {
        if (inst.video)
            return wadoURL(inst.wadoQueryParams, { contentType: 'video/mpeg' });
        if (inst.numberOfFrames)
            return wadoURL(inst.wadoQueryParams, { contentType: 'image/jpeg', frameNumber: inst.view });
        if (inst.gspsQueryParams.length)
            return wadoURL(inst.gspsQueryParams[inst.view - 1]);
        return wadoURL(inst.wadoQueryParams);
    }
    function wadoURL() {
        var i, url = "../aets/" + $scope.aet + "/wado?requestType=WADO";
        for (i = 0; i < arguments.length; i++) {
            angular.forEach(arguments[i], function(value, key) {
                url += '&' + key + '=' + value;
            });
        };
        return url;
    }
    function extractAttrs(attrs, tags, extracted) {
        angular.forEach(attrs, function (value, tag) {
            if (binarySearch(tags, parseInt(tag, 16)) >= 0) {
                extracted[tag] = value;
            }
        });
    }
    function binarySearch(ar, el) {
        var m = 0;
        var n = ar.length - 1;
        while (m <= n) {
            var k = (n + m) >> 1;
            var cmp = el - ar[k];
            if (cmp > 0) {
                m = k + 1;
            } else if(cmp < 0) {
                n = k - 1;
            } else {
                return k;
            }
        }
        return -m - 1;
    }
    function createGSPSQueryParams(attrs) {
        var sopClass = valueOf(attrs['00080016']),
            refSeries = valuesOf(attrs['00081115']),
            queryParams = [];
        if (sopClass === '1.2.840.10008.5.1.4.1.1.11.1' && refSeries) {
            refSeries.forEach(function(seriesRef) {
                valuesOf(seriesRef['00081140']).forEach(function(objRef) {
                    queryParams.push({
                        studyUID: attrs['0020000D'].Value[0],
                        seriesUID: seriesRef['0020000E'].Value[0],
                        objectUID: objRef['00081155'].Value[0],
                        contentType: 'image/jpeg',
                        frameNumber: valueOf(objRef['00081160']) || 1,
                        presentationSeriesUID: attrs['0020000E'].Value[0],
                        presentationUID: attrs['00080018'].Value[0]
                    })
                })
            })
        }
        return queryParams;
    }
    function isVideo(attrs) {
        var sopClass = valueOf(attrs['00080016']);
        return [
            '1.2.840.10008.5.1.4.1.1.77.1.1.1',
            '1.2.840.10008.5.1.4.1.1.77.1.2.1',
            '1.2.840.10008.5.1.4.1.1.77.1.4.1']
            .indexOf(sopClass) != -1 ? 1 : 0;
    }
    function valuesOf(attr) {
        return attr && attr.Value;
    }
    function valueOf(attr) {
        return attr && attr.Value && attr.Value[0];
    }
    function createArray(n) {
        var a = [];
        for (var i = 1; i <= n; i++)
            a.push(i);
        return a;
    }
    function initAETs(retries) {
        $http.get("../aets").then(
            function (res) {
                $scope.aes = res.data;
                $scope.aet = res.data[0].title;
            },
            function (res) {
                if (retries)
                    initAETs(retries-1);
            });
    }
    function initAttributeFilter(entity, retries) {
        $http.get("../attribute-filter/" + entity).then(
            function (res) {
                $scope.attributeFilters[entity] = res.data;
            },
            function (res) {
                if (retries)
                    initAttributeFilter(entity, retries-1);
            });
    }
    function initExporters(retries) {
        $http.get("../export").then(
            function (res) {
                $scope.exporters = res.data;
                if(res.data && res.data[0] && res.data[0].id){
                    $scope.exporterID = res.data[0].id;
                }
            },
            function (res) {
                if (retries)
                    initExporters(retries-1);
            });
    }
    function initRjNotes(retries) {
        $http.get("../reject").then(
            function (res) {
                var rjnotes = res.data;
                rjnotes.sort(function (a, b) {
                    if (a.codeValue === "113039" && a.codingSchemeDesignator === "DCM")
                        return -1;
                    if (b.codeValue === "113039" && b.codingSchemeDesignator === "DCM")
                        return 1;
                    return 0;
                });
                $scope.rjnotes = rjnotes;
                $scope.reject = rjnotes[0].codeValue + "^" + rjnotes[0].codingSchemeDesignator;
            },
            function (res) {
                if (retries)
                    initRjNotes(retries-1);
            });
    }
    // $(".div-table > .repeat0 > .thead .tr_row").bind("click",".div-table",function(){
    //     console.log("in hover", $(".div-table > .header1 > .tr_row"));
    //     $(".div-table > .header1 > .tr_row").css({
    //         background:"blue"
    //     });
    // });

    initAETs(1);
    initAttributeFilter("Patient", 1);
    initExporters(1);
    initRjNotes(1);
});
