/**
 * K-engine v1.6.20120911
 * @author KevinFong<kenkyoken@163.com>
 */

var K_project = (function($) {
    /**
     * 推演文本
     * 内容：
     * main:文本&对话,C_Cg:立绘图,C_Name:角色名,C_Place:角色位置
     *
     * @var object
     * @access private
     */
    var _script;

    /**
     * 场景名
     *
     * @var string
     * @access private
     */
    var _name;

    /**
     * 主舞台元素
     *
     * @var object
     * @access private
     */
    var _obj;

    /**
     * 背景及特效
     * 内容:
     * fn:文件路径,moveStart:移动起始位置,moveEnd:移动结束位置,oStart:起始透明度,oEnd:结束透明度,rtime:过程时间(单位:秒)
     *
     * @var array
     * @access private
     */
    var _bg = [];

    /**
     * 音效
     * 内容：
     * fn:文件路径,loop:1为循环其他为不循环
     *
     * @var array
     * @access private
     */
    var _audio = [];

    /**
     * 素材
     * 內容:
     * fn:文件路徑,width:寬,height:高
     *
     * @var array
     * @access private
     */
    var _items = [];

    /**
     * 主舞台宽度
     *
     * @var int
     * @access private
     */
    var _width;

    /**
     * 主舞台高度
     *
     * @var int
     * @access private
     */
    var _height;

    /**
     * 主舞台X坐标(中心点)
     *
     * @var int
     * @access private
     */
    var _x;

    /**
     * 主舞台Y坐标(中心点)
     *
     * @var int
     * @access private
     */
    var _y;

    /**
     * 立绘缓存
     *
     * @var array
     * @access private
     */
    var _cgCache = [];

    /**
     * 背景缓存
     *
     * @var array
     * @access private
     */
    var _bgCache = [];

    /**
     * 音频缓存
     *
     * @var array
     * @access private
     */
    var _auCache = [];

    /**
     * 素材緩存
     *
     * @var array
     @ access private
     */
    var _itemsCache = [];

    /**
     * 音频回调
     *
     *
     * @var array
     * @access private
     */
    var _auComplete = [];

    /**
     * 文本顺序指针
     *
     * @var int
     * @access private
     */
    var _seq = 0;

    /**
     * 是否允许推送下一句文本
     *
     * @var boolean
     * @access private
     */
    var _goNext = true;

    /**
     * 历史文本框开关
     *
     * @var boolean
     * @access private
     */
    var _history = false;



    /**
     * 检查数组是否包含目标值
     *
     * @access private
     * @param string _val 目标值
     * @param array _array 被检查的数组
     * @retrun boolean 结果
     */
    var in_array = function(_val, _array) {
            for (var _i = 0; _i < _array.length; _i++) {
                if (_array[_i] == _val) {
                    return true;
                }
            }
            return false;
        };

    /**
     * 文本演示对象
     *
     * @var object
     * @access private
     */
    var _push = (function() {
        var _letter = [];
        var _i = 0;
        var _t, _text;
        var obj = {
            setLetter: function(w) {
                _letter = w.split('');
                _text = w;
                $('#history').append('<p class="text">' + _text + '</p>');
            },
            toArea: function() {
                $('#ui').unbind();
                if (_i < _letter.length) {
                    if (_goNext) {
                        $('#ui').bind('click', _push.cut);
                    }
                    if (_letter[_i] == '|') $('#now').append('<br/>');
                    else $('#now').append(_letter[_i]);
                    _i++;
                    _t = setTimeout(_push.toArea, 50);
                } else {
                    _i = 0;
                    _seq++;
                    clearTimeout(_t);
                    $('#ui').bind('click', _dialog);
                }
            },
            cut: function() {
                clearTimeout(_t);
                _i = 0;
                _seq++;
                _text = _text.replace(/\|/g, '<br/>');
                $('#now').html(_text);
                $('#ui').unbind();
                $('#ui').bind('click', _dialog);
            }
        };
        return obj;
    })();

    /**
     * 剧本推演主函数(cg,audio)
     *
     * @access private
     */
    var _dialog = function() {
            //判断剧本是否结束
            if (_seq > _script.length - 1 || !_goNext) {
                return null;
            }
            $('#ui').css('background', 'none');
            //bgm播放
            if (typeof _script[_seq]['audio'] != 'undefined') {
                if (typeof _script[_seq]['audio']['stop'] != 'undefined') {
                    $.each(_script[_seq]['audio']['stop'], function(k, v) {
                        _auCache[v].pause();
                    });
                }
                if (typeof _script[_seq]['audio']['play'] != 'undefined') {
                    $.each(_script[_seq]['audio']['play'], function(k, v) {
                        _auCache[v].play();
                    });
                }
            }
            //新立绘处理
            if (typeof _script[_seq]['C_Cg'] != 'undefined') {
                $.each(_cgCache, function(k, v) {
                    if (v.src.indexOf(_script[_seq]['C_Cg']) != -1) {
                        $('#cha' + _script[_seq]['C_Place'] + 'cg').attr('src', v.src);
                    }
                });
            }
            //显示新立绘
            if (typeof _script[_seq]['C_Place'] != 'undefined') {
                $('#cha' + _script[_seq]['C_Place']).fadeTo('normal', 1);
                $('.cha:not(#cha' + _script[_seq]['C_Place'] + ')').fadeTo('fast', 0.5);
            }
            //调用文本特效函数
            _dialogRun();
        };

    /**
     * 文本处理&特效调用&选项处理
     *
     * @access private
     */
    var _dialogRun = function() {
            if (typeof _script[_seq]['options'] !== 'undefined') {
                $(_obj).prepend('<div id="options" style="display:none"></div>');
                var _cx = parseInt(_width) / 2 - 150;
                var _cy = parseInt(_height) / 2 - 100;
                $('#options').css({
                    'width': '300px',
                    'height': '200px',
                    'top': _cy + 'px',
                    'left': _cx + 'px',
                    'position': 'absolute',
                    'z-index': '99',
                    'background': 'rgba(255,255,255,0.8)',
                    'border-radius': '15px',
                    'outline': '5px double black'
                });
                var _html = '<table style="margin:10px;width:93%"><tr><td width="100%">' + _script[_seq]['main'] + '</td></tr>';
                $.each(_script[_seq]['options'], function(k, v) {
                    _html = _html + '<tr><td><p class="option"><a href="' + v + '">' + k + '</a></p></td></tr>';
                });
                _html = _html + '</table>';
                $('#options').html(_html);
                $('.option').css({
                    'height': '20px',
                    'line-height': '20px',
                    'text-align': 'center',
                    'background': '#0072c6',
                    'padding': '10px 0px',
                    'word-break': 'break-all'
                });
                $('.option a').css({
                    'text-decoration': 'none',
                    'color': 'white'
                });
                $('#options').fadeIn();
                return;
            }
            $('#textarea').html('<p id="now" class="text"></p>');
            $('#now').css({
                'font-family': 'arial',
                'font-size': 'medium',
                'line-height': '25px',
                'font-weight': 'normal',
                'word-break': 'break-all',
                'letter-spacing': '2px'
            });
            $('.text').css({
                'color': 'white',
                'margin': '10px'
            });
            _push.setLetter(_script[_seq]['main']);
            _push.toArea();
            if (typeof _script[_seq]['C_Event'] != 'undefined') {
                _effectDispatcher(_script[_seq]['C_Event']);
            }
        };


    /**
     * 特效指派器
     *
     * @param array C_Event key为特效名 value为特效参数
     */
    var _effectDispatcher = function(C_Event) {
            $.each(C_Event, function(effectName, effectParam) {
                effectName = effectName.split('#');
                effectName = effectName[0];
                switch (effectName) {
                case 'line':
                    _line(effectParam);
                    break;
                case 'shake':
                    _shake(effectParam);
                    break;
                case 'show':
                    _show(effectParam);
                    break;
                case 'hide':
                    _hide(effectParam);
                    break;
                case 'flash':
                    _flash();
                    break;
                case 'scale':
                    _scale(effectParam);
                    break;
                case 'restore':
                    _restore(effectParam);
                    break;
                case 'work':
                    _work.setArgs(effectParam);
                    break;
                case 'movework':
                    _moveWork(effectParam);
                    break;
                case 'openeye':
                    _openEye();
                    break;
                case 'cghide':
                    _cgHide(effectParam);
                    break;
                case 'itemshow':
                    _itemShow(effectParam);
                    break;
                }
            });
        };

    var _itemShow = function(Args) {
            var _target = Args['target'];
            var _w = _itemsCache[_target].width;
            var _h = _itemsCache[_target].height;
            var _x = (parseInt(_width) - _w) / 2;
            var _y = (parseInt(_height) - _h) / 2;
            $(_itemsCache[_target]).css({
                'position': 'relative',
                'top': _y + 'px',
                'left': _x + 'px',
                'opacity': '0'
            });
            $('#sp_bg').html(_itemsCache[_target]);
            $('#sp_bg').css('background', 'rgba(0,0,0,0.3)');
            $('#sp_bg').fadeTo(0, 1);
            $(_itemsCache[_target]).fadeTo(500, 1);
        };

    /**
     * cg隐藏&恢复显示
     *
     * @param Args array 需要隐藏的cg位置号
     * @access private
     */
    var _cgHide = function(Args) {
            $.each(Args, function(v, k) {
                if ($('#cha' + k + 'cg').css('opacity') == '0') {
                    $('#cha' + k + 'cg').fadeTo(500, 1);
                } else {
                    $('#cha' + k + 'cg').fadeTo(500, 0);
                }
            });
        };

    /**
     * 挣开眼特效
     *
     * @access private
     */
    var _openEye = function() {
            $('#sp_bg').html('<div id="eyeup" class="eye"></div><div id="eyedown" class="eye"></div>');
            $('#sp_bg').css('background', 'rgba(0,0,0,0.5)');
            $('.eye').css({
                'width': parseInt(_width) + 'px',
                'height': (parseInt(_height) / 2) + 'px',
                'background': '#000',
                'position': 'absolute'
            });
            $('#eyeup').css({
                'top': '0px',
                'left': '0px',
                'box-shadow': '0px 5px 11px #000'
            });
            $('#eyedown').css({
                'bottom': '0px',
                'left': '0px',
                'box-shadow': '0px -5px 11px #000'
            });
            _goNext = false;
            $('#sp_bg').fadeTo(0, 1);
            $('.eye').animate({
                'height': (parseInt(_height) / 2 * 0.8) + 'px'
            }, 1000).delay(200);
            $('.eye').animate({
                'height': (parseInt(_height) / 2) + 'px'
            }, 1000, function() {
                $('#sp_bg').css('background', 'rgba(0,0,0,0)').delay(200);
            });
            $('.eye').animate({
                'height': '0px',
                'opacity': '0.5'
            }, 2500, function() {
                _goNext = true;
            });
        };

    /**
     * 黑底白字淡入淡出效果
     *
     * @param array Args text:文字, out:显示结束后是否淡出sp_bg层，默认为是
     */
    var _moveWork = function(Args) {
            $('#sp_bg').html('<span id="movework" style="font-size:20px">' + Args['text'] + '</span>');
            var _cl = parseInt(_width) / 2;
            var _ct = parseInt(_height) / 2;
            var _hw = $('#movework').width() / 2;
            var _hh = $('#movework').height() / 2;
            $('#movework').css({
                'break-work': 'break-all',
                'position': 'relative',
                'top': _ct - _hh + 'px',
                'left': _cl - _hw + 'px',
                'color': '#fff',
                'text-align': 'center',
                'opacity': '0'
            });
            if (typeof Args['bg'] != 'undefined') {
                $('#sp_bg').css('background', Args['bg']);
            } else {
                $('#sp_bg').css('background', '#000');
            }
            $('#sp_bg').fadeTo(0, 1);
            _goNext = false;
            $('#movework').animate({
                'opacity': '1'
            }, 1000, function() {
                $(this).fadeTo(1000, 0, function() {
                    $('#sp_bg').html('');
                    if (typeof Args['out'] == 'undefined' || Args['out'] != 'false') {
                        $('#sp_bg').fadeTo(500, 0, function() {
                            _goNext = true;
                        });
                    } else {
                        _goNext = true;
                    }
                }).delay(100);
            });
        };

    /**
     * 文字群特效
     *
     * @access private
     */
    var _work = (function() {
        var __text = new Array();
        var __bg = null;
        var __obj = null;
        var __cav = null;
        var __z = new Array();
        var __t = null;
        var __c = 0;
        var __init = function() {
                __obj = document.getElementById('cav_bg');
                __cav = __obj.getContext('2d');
                __cav.clearRect(0, 0, parseInt(_width), parseInt(_height));
                if (__bg == 'white') {
                    __cav.fillStyle = '#eee';
                } else {
                    __cav.fillStyle = '#333';
                }
                __cav.fillRect(0, 0, _width, _height);
                if (__bg == 'white') {
                    __cav.fillStyle = '#333';
                } else {
                    __cav.fillStyle = '#eee';
                }
                for (var _i = 0; _i < __text.length; _i++) {
                    __z[_i] = parseInt(Math.random() * __text.length);
                }
                if (typeof __text[__z[0]] != 'undefined') {
                    __cav.font = "70px 雅黑";
                    __cav.fillText(__text[__z[0]], 300, 100);
                }
                if (typeof __text[__z[1]] != 'undefined') {
                    __cav.font = "30px 雅黑";
                    __cav.fillText(__text[__z[1]], 200, 300);
                }
                if (typeof __text[__z[2]] != 'undefined') {
                    __cav.font = "40px 雅黑";
                    __cav.fillText(__text[__z[2]], 50, 350);
                }
                if (typeof __text[__z[3]] != 'undefined') {
                    __cav.font = '55px 雅黑';
                    __cav.fillText(__text[__z[3]], 350, 450);
                }
                if (typeof __text[__z[4]] != 'undefined') {
                    __cav.font = '50px 雅黑';
                    __cav.fillText(__text[__z[4]], 200, 200);
                }
                if (typeof __text[__z[5]] != 'undefined') {
                    __cav.font = '40px 雅黑';
                    __cav.fillText(__text[__z[5]], 450, 350);
                }
                if (typeof __text[__z[6]] != 'undefined') {
                    __cav.font = '60px 雅黑';
                    __cav.fillText(__text[__z[6]], 100, 550);
                }
                if (typeof __text[__z[7]] != 'undefined') {
                    __cav.font = '40px 雅黑';
                    __cav.fillText(__text[__z[7]], 100, 130);
                }
                if (typeof __text[__z[8]] != 'undefined') {
                    __cav.font = '70px 雅黑';
                    __cav.fillText(__text[__z[8]], 10, 700);
                }
            };
        var __animate = function() {
                _goNext = false;
                if (__c % 10 == 0) {
                    if (__bg == 'white') {
                        __bg = 'black';
                    } else {
                        __bg = 'white';
                    }
                    __init();
                }
                __c++;
                if (__c >= 250) {
                    _goNext = true;
                    return;
                } else {
                    setTimeout(__animate, 1);
                }
            };
        var __callback = {
            setArgs: function(Args) {
                __text = Args['text'];
                if (typeof Args['bg'] != 'undefined') {
                    __bg = Args['bg'];
                } else {
                    __bg = 'black';
                }
                __init();
                $(__obj).fadeTo(1000, 1, function() {
                    if (typeof Args['animate'] != 'undefined') {
                        __animate();
                    }
                });
            }
        };
        return __callback;
    })();

    /**
     * 还原背景图成原来大小
     *
     * @param int Args 目标背景层号
     * @access private
     */
    var _restore = function(Args) {
            var _cssList = [];
            var _goNext = false;
            if (typeof _bg[Args]['moveStart'] != 'undefined') {
                var _startPlace = _bg[Args]['moveStart'].split(" ");
                _cssList['top'] = parseInt(_y) + parseInt(_startPlace[1]);
                _cssList['left'] = parseInt(_x) + parseInt(_startPlace[0]);
            } else {
                _cssList['top'] = parseInt(_y);
                _cssList['left'] = parseInt(_x);
            }
            if (typeof _bg[Args]['width'] != 'undefined') {
                _cssList['width'] = _bg[Args]['width'];
            } else {
                _cssList['width'] = _bgCache[Args].naturalWidth;
            }
            if (typeof _bg[Args]['height'] != 'undefined') {
                _cssList['height'] = _bg[Args]['height'];
            } else {
                _cssList['height'] = _bgCache[Args].naturalHeight;
            }
            if (typeof Args['opacity'] != 'undefined') {
                _cssList['opacity'] = Args['opacity'];
            }
            $('#bglayout_' + Args).animate(_cssList, 'fast', function() {
                _goNext = true;
            });
        };

    /**
     * canvas图案特效
     *
     * @param array Args 参数:   type: grid=>网格,radar=>雷达，spiral=>螺旋线   color: 线条颜色   bgcolor:背景色
     * @access private
     */
    var _line = function(Args) {
            var obj = document.getElementById('cav_bg');
            var cav = obj.getContext('2d');
            cav.clearRect(0, 0, parseInt(_width), parseInt(_height));
            $(obj).css('opacity', 0);
            cav.strokeStyle = '#000';
            if (typeof Args['color'] != 'undefined') {
                cav.strokeStyle = Args['color'];
            }
            if (typeof Args['bgcolor'] != 'undefined') {
                cav.fillStyle = Args['bgcolor'];
                cav.fillRect(0, 0, _width, _height);
            }
            switch (Args['type']) {
            case 'grid':
                var _space = 20;
                var _wTime = Math.ceil(parseInt(_width) / _space);
                var _hTime = Math.ceil(parseInt(_height) / _space);
                for (var _i = 1; _i <= _wTime; _i++) {
                    cav.moveTo(_i * _space, 0);
                    cav.lineTo(_i * _space, _height);
                    cav.stroke();
                }
                for (_i = 1; _i <= _hTime; _i++) {
                    cav.moveTo(0, _i * _space);
                    cav.lineTo(_width, _i * _space);
                    cav.stroke();
                }
                break;
            case 'radar':
                var _r = 50;
                if (typeof Args['radius'] != 'undefined') {
                    _r = Args['radius'];
                }
                var _n = 4;
                if (typeof Args['times'] != 'undefined') {
                    _n = Args['times'];
                }
                var _hWidth = parseInt(_width) / 2;
                var _hHeight = parseInt(_height) / 2;
                cav.moveTo(0, _hHeight);
                cav.lineTo(_width, _hHeight);
                cav.stroke();
                cav.moveTo(_hWidth, 0);
                cav.lineTo(_hWidth, _height);
                cav.stroke();
                cav.moveTo(0, 0);
                cav.lineTo(_width, _height);
                cav.stroke();
                cav.moveTo(_width, 0);
                cav.lineTo(0, _height);
                cav.stroke();
                for (var _i = 1; _i <= _n; _i++) {
                    cav.moveTo(_hWidth - (_r * _i), _hHeight);
                    cav.arc(_hWidth, _hHeight, _r * _i, 0, Math.PI * 2, false);
                    cav.stroke();
                }
                break;
            case 'spiral':
                var _hWidth = parseInt(_width) / 2;
                var _hHeight = parseInt(_height) / 2;
                var _r = 50;
                if (typeof Args['radius'] != 'undefined') {
                    _r = Args['radius'];
                }
                var _i = true;
                var _w = _hWidth;
                var _t = 1;
                while (_r < _hHeight && _r < _hWidth) {
                    cav.moveTo(_w + _r, _hHeight);
                    cav.arc(_w, _hHeight, _r, 0, Math.PI, _i);
                    if (_i) {
                        _i = false;
                        _w = -0.1 * _r + _w;
                    } else {
                        _i = true;
                        _w = 0.1 * _r + _w;
                    }
                    _r = _r * 1.1;
                    _t++;
                }
                cav.stroke();
                break;
            }
            $(obj).fadeTo(1000, 1);
        };

    /**
     * 闪电效果
     *
     * @access private
     */
    var _flash = function() {
            _goNext = false;
            $('#sp_bg').fadeTo(50, 0.5);
            $('#sp_bg').fadeTo(50, 0);
            $('#sp_bg').fadeTo(100, 0.5);
            $('#sp_bg').fadeTo(100, 0).delay(500);
            $('#sp_bg').fadeTo(100, 0.7);
            $('#sp_bg').fadeTo(1000, 0 ,function (){
                _goNext = true;
            });
        };

    /**
     * 缩放特效
     *
     * @param array Args 参数: target:目标背景层,scale:缩放比例,position:焦点坐标,opacity:透明度
     * @access private
     */
    var _scale = function(Args) {
            var _actionList = [];
            var _rtime = 500;
            var _target = Args['target'];
            if (typeof Args['scale'] != 'undefined') {
                _actionList['width'] = $('#bglayout_' + _target).width() * Args['scale'];
                _actionList['height'] = $('#bglayout_' + _target).height() * Args['scale'];
            } else {
                if (typeof Args['width'] != 'undefined' && typeof Args['height'] != 'undefined') {
                    _actionList['width'] = Args['width'] + 'px';
                    _actionList['height'] = Args['height'] + 'px';
                }
            }
            if (typeof Args['position'] != 'undefined') {
                var Position = Args['position'].split(" ");
                _actionList['top'] = parseInt($('#bglayout_' + _target).css('top')) - parseInt(Position[1]) + 'px';
                _actionList['left'] = parseInt($('#bglayout_' + _target).css('left')) - parseInt(Position[0]) + 'px';
            }
            if (typeof Args['opacity'] != 'undefined') {
                _actionList['opacity'] = Args['opacity'];
            }
            if (typeof Args['rtime'] != 'undefined') {
                _rtime = Args['rtime'];
            }
            $('#bglayout_' + _target).animate(_actionList, parseInt(_rtime), 'linear');
        };

    /**
     * 背景层淡入特效
     *
     * @param array Args 参数 0、target 1、opacity 2、rtime
     * @access private
     */
    var _show = function(Args) {
            var _o = 1;
            if (typeof Args[1] != 'undefined') {
                _o = Args[1];
            }
            var _rtime = 2000;
            if (typeof Args[2] != 'undefined') {
                _rtime = parseInt(Args[2]);
            }
            if (Args[0] == 'canvas') {
                $('#cav_bg').animate({
                    opacity: _o
                }, {
                    duration: _rtime
                });
                return;
            }
            $('#bglayout_' + Args[0]).animate({
                opacity: _o
            }, {
                duration: _rtime
            });
        };

    /**
     * 背景层淡出特效
     *
     * @param array Args 参数 0、target 1、rtime
     * @access private
     */
    var _hide = function(Args) {
            var _rtime = 2000;
            if (typeof Args[1] != 'undefined') {
                _rtime = parseInt(Args[1]);
            }
            if (Args[0] == 'canvas') {
                $('#cav_bg').animate({
                    opacity: 0
                }, {
                    duration: _rtime
                });
                return;
            }
            if (Args[0] == 'sp_bg') {
                $('#sp_bg').animate({
                    opacity: 0,
                    background: '#fff'
                }, {
                    duration: _rtime
                });
                return;
            }
            $('#bglayout_' + Args[0]).animate({
                opacity: 0
            }, {
                duration: _rtime
            });
        };

    /**
     * 震动特效
     *
     * @param int Args 震动次数
     * @access private
     */
    var _shake = function(Args) {
            var args = parseInt(Args);
            if (isNaN(args) || args == 0) {
                args = 1;
            }
            var shtop = parseInt($(_obj).css('top'));
            var sleft = parseInt($(_obj).css('left'));
            shtop = parseInt(shtop);
            sleft = parseInt(sleft);
            var s = 80;
            for (var i = 1; i <= args; i++) {
                $(_obj).animate({
                    top: shtop - 10 + 'px',
                    left: sleft - 10 + 'px'
                }, {
                    duration: s
                });
                $(_obj).animate({
                    top: shtop + 10 + 'px',
                    left: sleft + 10 + 'px'
                }, {
                    duration: s
                });
                $(_obj).animate({
                    top: shtop + 10 + 'px',
                    left: sleft - 20 + 'px'
                }, {
                    duration: s
                });
                $(_obj).animate({
                    top: shtop - 10 + 'px',
                    left: sleft + 10 + 'px'
                }, {
                    duration: s
                });
                $(_obj).animate({
                    top: shtop + 'px',
                    left: sleft + 'px'
                }, {
                    duration: s
                }).delay(800);
            }
        };

    /**
     * 立绘缓存
     *
     * @access private
     */
    var _cgCacheFunc = function() {
            var cg = [];
            var i = 0;
            $.each(_script, function(Key, Value) {
                if (typeof Value['C_Cg'] != 'undefined' && Value['C_Cg'] != '') {
                    cg[i] = [];
                    if (typeof Value['Cg_width'] != 'undefined' && Value['Cg_width'] != '') {
                        cg[i]['width'] = Value['Cg_width'];
                    }
                    if (typeof Value['Cg_height'] != 'undefined' && Value['Cg_height'] != '') {
                        cg[i]['height'] = Value['Cg_height'];
                    }
                    cg[i]['fn'] = Value['C_Cg'];
                    i++;
                }
            });
            $.each(cg, function(k, v) {
                _cgCache[k] = new Image();
                _cgCache[k].src = v['fn'];
                if (typeof v['width'] != 'undefined') {
                    _cgCache[k].width = v['width'];
                }
                if (typeof v['height'] != 'undefined') {
                    _cgCache[k].height = v['height'];
                }
            });
        };

    /**
     * 背景缓存
     *
     * @access private
     */
    var _bgCacheFunc = function() {
            $.each(_bg, function(k, v) {
                _bgCache[k] = new Image();
                _bgCache[k].src = v['fn'];
                _bgCache[k].id = 'bglayout_' + k;
                _bgCache[k].className = 'bglayout';
                $(_bgCache[k]).css({
                    'position': 'absolute',
                    'top': _y + 'px',
                    'left': _x + 'px'
                });
                if (typeof v['width'] != 'undefined') {
                    $(_bgCache[k]).width(parseInt(v['width']));
                }
                if (typeof v['height'] != 'undefined') {
                    $(_bgCache[k]).height(parseInt(v['height']));
                }
            });
        };

    /**
     * 音频缓存
     *
     * @access private
     */
    var _auCacheFunc = function() {
            $.each(_audio, function(k, v) {
                _auCache[k] = new Audio(v['fn']);
                _auCache[k].id = 'audio_' + k;
                if (v['loop'] == '1') {
                    _auCache[k].loop = true;
                }
                _auCache[k].control = false;
                _auComplete[k] = false;
                _auCache[k].addEventListener('canplaythrough', _auCacheComplete, false);
            });
        };

    /**
     * 音频缓存回调
     *
     * @access private
     */
    var _auCacheComplete = function() {
            var _e = arguments[0];
            var _id = _e.target.id;
            _id = _id.replace(/audio_/, '');
            _auComplete[_id] = true;
        };

    /**
     * 素材缓存
     *
     * @access private
     */
    var _itemsCacheFunc = function() {
            $.each(_items, function(Key, Val) {
                _itemsCache[Key] = new Image();
                _itemsCache[Key].src = Val['fn'];
                if (typeof Val['width'] != 'undefined') {
                    _itemsCache[Key].width = Val['width'];
                }
                if (typeof Val['height'] != 'undefined') {
                    _itemsCache[Key].width = Val['height'];
                }
            });
        }

        /**
         * 缓存检查
         * 完成后回调舞台构筑函数
         *
         * @access private
         * @return boolean 缓存是否完成
         */
    var _checkCache = function() {
            var a = true;
            var b = true;
            var c = true;
            var e = true;
            var _bc = 0;
            var _cc = 0;
            var _ac = 0;
            var _ec = 0;
            if (_audio.length != 0) {
                $.each(_auComplete, function(k2, v2) {
                    if (v2) {
                        _ac++;
                    } else {
                        a = false;
                    }
                });
                $('#load_status p:eq(4)').html('bgm载入:' + _ac + '/' + _auCache.length);
            }
            if (_bg.length != 0) {
                $.each(_bgCache, function(k, v) {
                    if (v.complete == false || typeof v == 'undefined') {
                        b = false;
                    } else {
                        _bc++;
                    }
                });
                $('#load_status p:eq(1)').html('背景载入:' + _bc + '/' + _bgCache.length);
            }
            $.each(_cgCache, function(k1, v1) {
                if (v1.complete == false || typeof v1 == 'undefined') {
                    c = false;
                } else {
                    _cc++;
                }
            });
            $('#load_status p:eq(2)').html('立绘载入:' + _cc + '/' + _cgCache.length);
            if (_items.length != 0) {
                $.each(_itemsCache, function(k3, v3) {
                    if (v3.complete == false || typeof v3 == 'undefined') {
                        e = false;
                    } else {
                        _ec++;
                    }
                });
                $('#load_status p:eq(3)').html('素材載入:' + _ec + '/' + _itemsCache.length);
            }
            if (a && b && c) {
                setTimeout(_dramaBuilder, 1300);
            } else {
                setTimeout(_checkCache, 300);
            }
        };

    /**
     * 构造舞台元素(文本框,背景,立绘)
     *
     * @access private
     */
    var _dramaBuilder = function() {
            $(_obj).html('');
            //背景层构筑       
            $.each(_bg, function(k, v) {
                $(_obj).append('<div id="bg' + k + '" class="bg"></div>');
                $('#bg' + k).css({
                    'position': 'absolute',
                    'z-index': '-' + k,
                    'width': $('#wrapper').width(),
                    'height': $('#wrapper').height(),
                    'top': '-' + _y + 'px',
                    'left': '-' + _x + 'px'
                });
                $('#bg' + k).append(_bgCache[k]);
                if (typeof v['oStart'] != 'undefined') {
                    $('#bglayout_' + k).css('opacity', parseInt(v['oStart']));
                }
                if (typeof v['moveStart'] != 'undefined') {
                    var _startPlace = v['moveStart'].split(" ");
                    $('#bglayout_' + k).css({
                        'left': (parseInt(_x) + parseInt(_startPlace[0])) + 'px',
                        'top': (parseInt(_y) + parseInt(_startPlace[1])) + 'px'
                    });
                }
                _bgEvent(k);
            });
            $(_obj).prepend('<div id="sp_bg"></div><canvas id="cav_bg"></canvas>');
            $('#sp_bg').css({
                'width': _width + 'px',
                'height': _height + 'px',
                'position': 'absolute',
                'z-index': '2',
                'opacity': '0',
                'background': '#fff'
            });
            $('#cav_bg').attr({
                'width': _width,
                'height': _height
            });
            $('#cav_bg').css({
                'opacity': '0',
                'position': 'absolute',
                'z-index': '1'
            });
            //ui层构筑
            $(_obj).prepend('<div id="ui"><div id="textarea"></div><div id="history"></div></div><button id="size">查看文本</button>');
            $('#ui,#size,#textarea,#history,#close_h').css('position', 'absolute');
            $('#ui').css({
                'width': (parseInt(_width) - 40) + 'px',
                'height': (parseInt(_height) - 40) + 'px',
                'top': '20px',
                'left': '20px',
                'z-index': '3',
                'background': '#000'
            });
            $('#size').css({
                'width': '100px',
                'height': '25px',
                'bottom': '20px',
                'right': '20px',
                'z-index': '11'
            });
            $('#textarea').css({
                'width': (parseInt(_width) - 40) + 'px',
                'height': '150px',
                'outline': '1px #ccc solid',
                'z-index': '10',
                'margin': '0px',
                'overflow': 'auto',
                'bottom': '0px',
                'background-color': 'rgba(0,0,0,0.5)'
            });
            $('#history').css({
                'width': (parseInt(_width) - 40) + 'px',
                'height': (parseInt(_height) - 40) + 'px',
                'background-color': 'rgba(0,0,0,0.9)',
                'z-index': '100',
                'overflow': 'auto',
                'display': 'none'
            });
            $('#ui').click(_dialog);
            $('#size').click(_viewHistory);
            for (var i = 1; i < 4; i++) {
                $('#ui').append('<div class="cha" id="cha' + i + '"><img id="cha' + i + 'cg"/></div>');
            }
            $('#ui,#size').css('display', 'block');
        };

    /**
     * 背景特效执行
     *
     * @param int Args 背景层号
     * @access private
     */
    var _bgEvent = function(Args) {
            if (typeof _bg[Args]['rtime'] != 'undefined') {
                var _actionList = [];
                if (typeof _bg[Args]['moveEnd'] != 'undefined') {
                    var _endPlace = _bg[Args]['moveEnd'].split(" ");
                    _actionList['left'] = parseInt(_x) + parseInt(_endPlace[0]);
                    _actionList['top'] = parseInt(_y) + parseInt(_endPlace[1]);
                }
                if (typeof _bg[Args]['oEnd'] != 'undefined') {
                    _actionList['opacity'] = parseInt(_bg[Args]['oEnd']);
                }
                $('#bglayout_' + Args).animate(_actionList, parseInt(_bg[Args]['rtime']), 'linear');
            }
        };

    /**
     * 弹出历史文本框
     *
     * @access private
     */
    var _viewHistory = function() {
            if (_history) {
                $('#history').fadeTo(500, 0);
                _history = false;
                $('#size').text('查看文本');
                $('#ui').click(_dialog);
            } else {
                $('#history').fadeTo(500, 1);
                _history = true;
                $('#size').text('回到游戏');
                $('#ui').unbind();
            }
        };

    var _callbackObject = {
        /**
         * 脚本设置
         *
         * @access public
         * @param object Script 总脚本(格式:json)
         * @param object containerObject 主舞台元素引用(非jQuery对象)
         */
        setScript: function(Script, containerObject) {
            _script = Script['dialogues'];
            if (typeof Script['BG'] != 'undefined') {
                _bg = Script['BG'];
            }
            if (typeof Script['audio'] != 'undefined') {
                _audio = Script['audio'];
            }
            if (typeof Script['items'] != 'undefined') {
                _items = Script['items'];
            }
            _name = Script['D_Name'];
            _obj = containerObject;
            _width = Script['width'];
            _height = Script['height'];

        },

        /**
         * 初始化,构造主舞台尺寸
         *
         * @access public
         */
        init: function() {
            $('title').html(_name);
            _x = ($('#wrapper').width()) / 2;
            _y = ($('#wrapper').height()) / 2;
            _x = _x - (_width / 2) + '';
            _y = _y - (_height / 2) + '';
            $(_obj).css({
                'position': 'relative',
                'outline': '1px solid #fff',
                'left': _x + 'px',
                'top': _y + 'px',
                'overflow': 'hidden'
            });
            $(_obj).width(_width);
            $(_obj).height(_height);
            $(_obj).html('<div id="load_status"><p>Now Loading...</p><p></p><p></p><p></p><p></p></div>');
            _cgCacheFunc();
            if (_bg.length != 0) {
                _bgCacheFunc();
            }
            if (_audio.length != 0) {
                _auCacheFunc();
            }
            if (_items.length != 0) {
                _itemsCacheFunc();
            }
            _checkCache();
        }
    };
    return _callbackObject;
})(jQuery);