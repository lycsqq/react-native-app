/**
 *
 * @author keyy/1501718947@qq.com 16/12/8 09:20
 * @description
 */
import React, {Component} from 'react'
import {
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackAndroid,
  Dimensions,
  Platform,
  InteractionManager,
  DeviceEventEmitter
} from 'react-native'
import {connect} from 'react-redux'
import BaseComponent from '../base/BaseComponent'
import Menu, {
  MenuContext,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu'
import * as HomeActions from '../actions/Home'
import * as Storage from '../utils/Storage'
import PhotoViewer from '../components/PhotoViewer'
import * as PhotoActions from '../actions/Photo'
import Spinner from '../components/Spinner'
import tmpGlobal from '../utils/TmpVairables'
import {ComponentStyles,CommonStyles} from '../style'

const styles = StyleSheet.create({
  scrollViewContainer: {
    flex: 1
  },
  tips: {
    flexDirection: 'row',
    padding: 10
  },
  tipsText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14
  }
});

let DictMap = {
  EducationLevelDict: [],
  IncomeLevelDict: [],
  JobTypeDict: [],
  MarriageStatusDict: [],
  DatingPurposeDict: [],
  PhotoPermissionDict: [],
  ReligionDict: []
};

//保存字典索引
let DictMapArrKey = ['EducationLevelDict', 'IncomeLevelDict', 'JobTypeDict', 'MarriageStatusDict', 'DatingPurposeDict', 'PhotoPermissionDict', 'ReligionDict'];

let navigator;

class EditPhotos extends BaseComponent {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      uploaded: true,
      changed: false
    };
    navigator = this.props.navigator;
    this.onBackAndroid = this.onBackAndroid.bind(this);
  }

  componentWillMount() {
    InteractionManager.runAfterInteractions(()=> {
      this._initPhotos();
    });
    if (Platform.OS === 'android') {
      BackAndroid.addEventListener('hardwareBackPress', this.onBackAndroid);
    }
  }

  componentWillUnmount() {
    if (Platform.OS === 'android') {
      BackAndroid.removeEventListener('hardwareBackPress', this.onBackAndroid);
    }
  }

  onBackAndroid() {
    this._backAlert();
  }

  _backAlert() {
    if (this.state.changed) {
      Alert.alert('提示', '您修改的资料未保存,确定要离开吗?', [
        {
          text: '确定', onPress: () => {
          navigator.pop();
        }
        },
        {
          text: '取消', onPress: () => {
        }
        }
      ]);
    } else {
      navigator.pop();
    }
  }

  onLeftPressed(){
    this._backAlert();
  }

  _initPhotos() {
    const {dispatch}=this.props;
    dispatch(HomeActions.getUserPhotos({UserId: tmpGlobal.currentUser.UserId}, (json)=> {
      this._initDict((DictMap, result)=> {
        this.setState({
          DictMap: DictMap,
          userPhotos: result.PhotoList,
          loading: false,
          CanUploadCountLeft: result.CanUploadCountLeft
        });
      }, json.Result);
    }, (error)=> {
    }));
  }

  _initDict(callBack, result) {
    //每次初始化字典时,需要把之前的数据清空
    DictMap = {
      EducationLevelDict: [],
      IncomeLevelDict: [],
      JobTypeDict: [],
      MarriageStatusDict: [],
      DatingPurposeDict: [],
      PhotoPermissionDict: [],
      ReligionDict: []
    };
    //下面是选填项的字典
    for (let i = 0; i < DictMapArrKey.length; i++) {
      Storage.getItem(`${DictMapArrKey[i]}`).then((response)=> {
        if (response && response.length > 0) {
          for (let j = 0; j < response.length; j++) {
            if (DictMapArrKey[i] == 'DatingPurposeDict' || DictMapArrKey[i] == 'PhotoPermissionDict') {
              DictMap[DictMapArrKey[i]].push(response[j])
            } else {
              DictMap[DictMapArrKey[i]].push(response[j].Value)
            }
          }
          if (i === DictMapArrKey.length - 1) {
            callBack(DictMap, result);
          }
        } else {
          console.error('获取下拉选项字典出错');
        }
      })
    }

  }

  //暂时去掉右上角的保存按钮
  getNavigationBarProps() {
    return {
      title: '编辑相册',
      //hideRightButton: false,
      //rightTitle: '保存'
    };
  }

  onRightPressed() {
    this._uploadPhotos();
  }

  _userPhotosChanges(data) {
    this.state.userPhotos.push(data);

    this.setState({
      uploaded: false,
      changed: true,
      ...this.state.userPhotos,
      CanUploadCountLeft: this.state.CanUploadCountLeft - 1 >= 0 ? this.state.CanUploadCountLeft - 1 : 0
    },()=>{
      this._uploadPhotos()
    });
  }

  _deletePhotoOnline(data) {
    const {dispatch}=this.props;
    dispatch(PhotoActions.deletePhoto(data, (json)=> {
      DeviceEventEmitter.emit('photoChanged', '相册有改动');
      this._initPhotos();
    }, (error)=> {
    }));
  }

  _deletePhotoOffline(data) {
    let index = this.state.userPhotos.findIndex((item)=> {
      return data.Id == item.Id;
    });
    this.state.userPhotos.splice(index, 1);
    this.setState({
      userPhotos: this.state.userPhotos,
      CanUploadCountLeft: this.state.CanUploadCountLeft + 1
    })
  }

  _uploadPhotos() {
    const {dispatch}=this.props;
    let tmpArr = [];
    for (let i = 0; i < this.state.userPhotos.length; i++) {
      if (!this.state.userPhotos[i].OnLine) {
        tmpArr.push(this.state.userPhotos[i]);
      }
    }
    if (tmpArr.length > 0) {
      dispatch(PhotoActions.uploadPhoto(tmpArr, ()=> {
        DeviceEventEmitter.emit('photoChanged', '相册有改动');
        this.setState({changed: false});
        this._initPhotos();
      }, (obj, arr, json)=> {
        //console.log(obj);
        DeviceEventEmitter.emit('photoChanged', '相册有改动');
        this._deletePhotoOffline(obj);
      }));
    } else {
      //不做任何操作
    }
  }

  _setPrimaryPhoto(data) {
    const {dispatch}=this.props;
    dispatch(PhotoActions.setPrimaryPhoto(data, (json)=> {
      DeviceEventEmitter.emit('photoChanged', '相册有改动');
      this._initPhotos();
    }, (error)=> {
    }));
  }

  _renderPhotos(arr) {
    return (
      <PhotoViewer
        imageArr={arr}
        totalCount={arr.length + this.state.CanUploadCountLeft}
        imageArrChanges={(data)=> {
          this._userPhotosChanges(data)
        }}
        upload={()=> {
          this._uploadPhotos()
        }}
        setPrimaryPhoto={(data)=> {
          this._setPrimaryPhoto(data)
        }}
        permissionOptions={this.state.DictMap.PhotoPermissionDict}
        deletePhotoOnline={(data)=> {
          this._deletePhotoOnline(data)
        }}
        deletePhotoOffline={(data)=> {
          this._deletePhotoOffline(data)
        }}
        changePermission={(data)=> {
          this._changePermission(data)
        }}
      />
    )
  }

  _changePermission(data) {
    const {dispatch}=this.props;
    dispatch(PhotoActions.setPhotoPermission(data, (json)=> {
      DeviceEventEmitter.emit('photoChanged', '相册有改动');
      this._initPhotos()
    }, (error)=> {
    }));
  }

  _renderTips() {
    if (this.state.CanUploadCountLeft === 0) {
      return (
        <View style={styles.tips}>
          <Text
            style={styles.tipsText}>{`您总共可以上传${this.state.userPhotos.length + this.state.CanUploadCountLeft}张照片,如需上传新照片,请删除一些再试。`}</Text>
        </View>
      )
    } else if (this.state.CanUploadCountLeft !== 0) {
      return (
        <View style={styles.tips}>
          <Text
            style={styles.tipsText}>{`您总共可以上传${this.state.userPhotos.length + this.state.CanUploadCountLeft}张照片,还可上传${this.state.CanUploadCountLeft}张照片`}</Text>
        </View>
      )
    } else {
      return null;
    }
  }

  renderBody() {
    if (this.state.loading) {
      return null
    } else {
      return (
        <MenuContext style={ComponentStyles.container}>
          <ScrollView
            style={styles.scrollViewContainer}>
            {this._renderTips()}
            {this._renderPhotos(this.state.userPhotos)}
          </ScrollView>
        </MenuContext>
      )
    }
  }

  renderSpinner() {
    if (this.props.pendingStatus) {
      return (
        <Spinner animating={this.props.pendingStatus}/>
      )
    }
  }

}

export default connect((state)=> {
  return {
    pendingStatus: state.Photo.pending
  }
})(EditPhotos)
