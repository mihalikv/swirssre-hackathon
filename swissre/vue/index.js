import Vue from 'vue';
import CryptoJS from 'crypto-js';
import {bdccGeoDistanceToPolyMtrs} from './BdccGeo.js';

window.App = new Vue({
    el: '#root',
    data: {
        map: null,
        risk: {
            edge: true, // true ak si pri hranici
            area: true  // ak si vnutri polygonu
        },
        myPosition: null,
        monster: null,
        area: {
            polyline: null,
            points: []
        },
        predict_data: [],
        distance: 0, // vzdialenost od najblizsieho edge
        ct: null,
        ot: null,
        json: null,
        code: null,
        codebool: false,
        notification: {
            message: 'RUN BITCH, RUN.',
            error: false
        },
        child_distance: 0,
        child_calories: 0,
        child_weight: 20,
        max_calories: 200,
        battery: 100
    },
    methods: {
        submitCode: function () {
            localStorage.setItem('code', this.code);
            window.location = "landing.html"
        },
        initMapVue: function () {
            if ($('#map').length <= 0)
                return;
            let self = this;
            var uluru = {lat: -25.363, lng: 131.044};
            this.map = new google.maps.Map(document.getElementById('map'), {
                zoom: 20,
                center: uluru,
                scrollwheel: false
            });
            this.monster = new google.maps.Marker({
                position: uluru,
                map: this.map,
                draggable: false,
                icon: 'img/child.png'
            });

            // this.monster.addListener('drag', this.moveHandler);
            // this.monster.addListener('dragend', this.moveHandler);

            var drawingManager = new google.maps.drawing.DrawingManager({
                drawingControl: true,
                editable: true,
                drawingControlOptions: {
                    position: google.maps.ControlPosition.TOP_CENTER,
                    drawingModes: ['polyline']
                }
            });
            drawingManager.setMap(this.map);

            google.maps.event.addListener(drawingManager, 'polylinecomplete', function (event) {
                let tmp;
                let object = event;
                for (var i = 0; i < object.getPath().getLength(); i++) {
                    self.area.points.push(object.getPath().getAt(i));
                }
                self.area.polyline = new google.maps.Polyline({
                    path: self.area.points
                });
            });
            this.requesthandler();
        },
        calculateDistanceToPoly: function () {
            if (this.area.polyline)
                this.distance = bdccGeoDistanceToPolyMtrs(this.area.polyline, this.monster.getPosition());
        },
        moveHandler: function () {
            this.isMonsterOut();
            this.calculateDistanceToPoly();
        },
        isMonsterOut: function () {
            if (this.area.polyline) {
                let tmp = google.maps.geometry.poly.containsLocation(this.monster.getPosition(), this.area.polyline);
                if ((tmp != this.risk.area) && !tmp) {
                    this.notification.message = "Your child is out of safe zone !!!";
                    this.notification.error = true;
                }
                this.risk.area = tmp;
            }
        },
        initMapPosition: function () {
            let url = "https://monster.kacer.me/api/location/10341d9759fef96f";
            let self = this;
            $.get(url,
                function (data) {
                    console.log("data recieved");
                    self.ct = data;
                    var value;
                    if (!self.risk.area)
                        value = 2;
                    else if (self.risk.edge)
                        value = 1;
                    else
                        value = 0;
                    if (self.predict_data.length > 180) {
                        self.predict_data.shift();
                    }
                    self.predict_data.push(value);
                }).fail(function (error) {
                self.ct = "Errors"
            });
        },
        requesthandler: function () {
            var self = this;
            setInterval(
                function () {
                    self.initMapPosition();
                }, 1000);
        },
        showNotification: function () {
            let self = this;
            $("#myModal").modal("show");
        },
        divideMatrix: function (m, d) {
            var matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];


            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    matrix[i][j] = m[i][j] / d;
                }
            }
            return matrix;
        },
        substractMatrix: function (a, b) {
            var matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    matrix[i][j] = a[i][j] - b[i][j];
                }
            }

            return matrix;
        },
        addMatrix: function (a, b) {
            var matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    matrix[i][j] = a[i][j] + b[i][j];
                }
            }

            return matrix;
        },
        multiplyVectors: function (a, b) {
            var res = 0;
            for (var i = 0; i < 3; ++i)
                res += a[i] * b[i];
            return res;
        },
        multiplyMatrix: function (a, b) {
            var matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
            for (var i = 0; i < 3; ++i) {
                for (var j = 0; j < 3; ++j) {
                    matrix[i][j] = this.multiplyVectors(a[i], [b[0][j], b[1][j], b[2][j]]);
                }
            }
            return matrix;
        }
    },
    watch: {
        'notification.message': function (newVal) {
            this.showNotification();
        },
        child_distance: function (newVal) {
            this.child_calories = this.child_weight * this.child_distance() * 1.66727 / 1000;
            this.battery = 100 - ((this.child_calories / this.max_calories)*100);
        },
        ct: function (newValue) {
            // decryption
            var key_hex = this.code; //'/ojPdzBDjL3KzAql7piX567T5+mZH2Eou4QZC7QyzdU=';
            var words = CryptoJS.enc.Base64.parse(key_hex);
            let arrayBuffer = new Array(16).fill(0);
            var iv = CryptoJS.lib.WordArray.create(arrayBuffer);
            var decrypted = CryptoJS.AES.decrypt(newValue.location, words, {iv: iv});
            this.ot = decrypted.toString(CryptoJS.enc.Utf8);
            let tmp_json = JSON.parse(this.ot);
            if (this.myPosition && this.monster && this.json) {
                let distance_parent = google.maps.geometry.spherical.computeDistanceBetween(this.monster.getPosition(), this.myPosition.getPosition());
                let mySpeed = 20;
                let old_data = new google.maps.LatLng(this.json.lat, this.json.lng);
                let new_data = new google.maps.LatLng(tmp_json.lat, tmp_json.lng);
                let distance_child = google.maps.geometry.spherical.computeDistanceBetween(old_data, new_data);
                this.child_distance += distance_child;
                let v = distance_child / 1.0;
                let critical_time = this.distance / v;
                if (((this.distance + distance_parent) - (mySpeed * critical_time)) < 0) {
                    this.notification.message = "You should speed up because your kid is crossing boundaries.";

                }
            }
            this.json = JSON.parse(this.ot);
        },

        json: {
            handler: function () {
                var latlng = new google.maps.LatLng(this.json.lat, this.json.lng);
                if (this.myPosition == null) {
                    this.myPosition = new google.maps.Marker({
                        position: latlng,
                        map: this.map,
                        draggable: true,
                        icon: 'img/parent.png'
                    });
                    this.map.panTo(latlng);
                }
                this.monster.setPosition(latlng);
                this.isMonsterOut();
                this.calculateDistanceToPoly();
            },
            deep: true
        },

        predict_data: {
            handler: function () {
                var matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
                var prev = this.predict_data[0];
                for (var i = 1; i < this.predict_data.length; ++i) {
                    var actual = this.predict_data[i];
                    matrix[prev][actual]++;
                    prev = actual;
                }
                for (var i = 0; i < 3; ++i) {
                    var divider = 0;
                    for (var j = 0; j < 3; ++j) {
                        divider += matrix[i][j];
                    }
                    if (divider == 0)
                        matrix[i][i] = 1;
                    else {
                        for (var j = 0; j < 3; ++j) {
                            matrix[i][j] /= parseFloat(divider);
                        }
                    }
                }
                for (var i = 0; i < 3; ++i)
                    matrix[i][i] -= 1;

                var q = matrix;
                var m = matrix;


                for (var i = 1; i < 6; ++i) {
                    m = this.multiplyMatrix(matrix, m);
                    var add = this.divideMatrix(m, i);
                    if (i % 2 == 0)
                        q = this.addMatrix(q, add);
                    else
                        q = this.substractMatrix(q, add);
                }
                q = this.divideMatrix(q, 6);
                var v = [0, 0, 0]
                v[this.predict_data[this.predict_data.length - 1]] = 1;

                var predict = [0, 0, 0]
                for (var i = 0; i < 3; ++i) {
                    predict[i] = this.multiplyVectors(q[i], v);
                }
                if (predict[1] > 0.7) {
                    this.notification.message = "Be ready for running!";
                }
                if (predict[2] > 0.7) {
                    this.notification.message = "Watch kids seems to be wondering to run away!";
                }
                console.log('priprav sa na bezanie:', predict[1], 'kde mas decko?', predict[2]);
            },
            deep: true
        },
        distance: function (newVal) {
            if (newVal < 8) {
                this.risk.edge = true;
            } else {
                this.risk.edge = false;
            }
        }
    },
    created: function () {
        this.code = localStorage.getItem('code');
        if (this.code)
            this.codebool = true
    }
});





