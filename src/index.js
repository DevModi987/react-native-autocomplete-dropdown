import debounce from 'lodash.debounce'
import PropTypes from 'prop-types'
import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  Text
} from 'react-native'
import { moderateScale, ScaledSheet } from 'react-native-size-matters'
import { withFadeAnimation } from './HOC/withFadeAnimation'
import { NothingFound } from './NothingFound'
import { RightButton } from './RightButton'
import { ScrollViewListItem } from './ScrollViewListItem'

export const AutocompleteDropdown = memo(
  forwardRef((props, ref) => {
    const inputRef = useRef(null)
    const containerRef = useRef(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [direction, setDirection] = useState(props.direction ?? 'down')
    const [isOpened, setIsOpened] = useState(false)
    const [searchText, setSearchText] = useState('')
    const [dataSet, setDataSet] = useState(props.dataSet)
    const clearOnFocus = props.clearOnFocus === false ? false : true
    const inputHeight = props.inputHeight ?? moderateScale(40, 0.2)
    const suggestionsListMaxHeight =
      props.suggestionsListMaxHeight ?? moderateScale(200, 0.2)
    const bottomOffset = props.bottomOffset ?? 0
    const ScrollViewComponent = props.ScrollViewComponent ?? ScrollView
    const InputComponent = props.InputComponent ?? TextInput

    useLayoutEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(inputRef.current)
        } else {
          ref.current = inputRef.current
        }
      }
    }, [inputRef])

    /** Set initial value */
    useEffect(() => {
      if (!Array.isArray(dataSet) || selectedItem) {
        // nothing to set or already setted
        return
      }

      let dataSetItem
      if (typeof props.initialValue === 'string') {
        dataSetItem = dataSet.find((el) => el.id === props.initialValue)
      } else if (
        typeof props.initialValue === 'object' &&
        props.initialValue.id
      ) {
        dataSetItem = dataSet.find((el) => el.id === props.initialValue.id)
      }

      if (dataSetItem) {
        setSelectedItem(dataSetItem)
      }
    }, [])

    /** expose controller methods */
    useEffect(() => {
      if (typeof props.controller === 'function') {
        props.controller({ close, open, toggle, clear, setInputText })
      }
    }, [isOpened, props.controller])

    useEffect(() => {
      setDataSet(props.dataSet)
    }, [props.dataSet])

    useEffect(() => {
      if (selectedItem) {
        setSearchText(selectedItem.title ?? '')
      } else {
        setSearchText('')
      }

      if (typeof props.onSelectItem === 'function') {
        props.onSelectItem(selectedItem)
      }
    }, [selectedItem])

    useEffect(() => {
      if (typeof props.onOpenSuggestionsList === 'function') {
        props.onOpenSuggestionsList(isOpened)
      }
      // renew state on close
      if (!isOpened) {
        if (selectedItem && props.resetOnClose !== false) {
          setSearchText(selectedItem.title)
        }
      }
    }, [isOpened])

    /**
     * For re-render list while typing and useFilter
     */
    useEffect(() => {
      if (props.useFilter !== false && Array.isArray(props.dataSet)) {
        setDataSet(props.dataSet.slice())
      }
    }, [searchText])

    const _onSelectItem = useCallback((item) => {
      setSelectedItem(item)

      inputRef.current.blur()
      setIsOpened(false)
    }, [])

    const calculateDirection = async () => {
      const [, positionY] = await new Promise((resolve) =>
        containerRef.current.measureInWindow((...rect) => {
          resolve(rect)
        })
      )

      const screenHeight = Dimensions.get('window').height

      const lowestPointOfDropdown =
        positionY + inputHeight + suggestionsListMaxHeight + bottomOffset

      const direction = lowestPointOfDropdown < screenHeight ? 'down' : 'up'
      setDirection(direction)
    }

    /** methods */
    const close = () => {
      setIsOpened(false)
    }

    const open = async () => {
      if (!props.direction) {
        await calculateDirection()
      }

      setIsOpened(true)
    }

    const toggle = () => {
      isOpened ? close() : open()
    }

    const clear = () => {
      onClearPress()
    }

    const setInputText = (text) => {
      setSearchText(text)
    }

    const ItemSeparatorComponent = props.ItemSeparatorComponent ?? (
      <View
        style={{ height: 1, width: '100%', backgroundColor: '#ddd' }}
      ></View>
    )

    const renderItem = useCallback(
      (item, searchText) => {
        if (typeof props.renderItem === 'function') {
          const LI = props.renderItem(item, searchText)
          return (<>            
            <TouchableOpacity onPress={() => _onSelectItem(item)} disabled={item.isold == 0 ? true : false}>              
              {LI}
            </TouchableOpacity>
            </>)
        }
        let titleHighlighted = ''
        let titleStart = item.title
        let titleEnd = ''
        if (
          typeof item.title === 'string' &&
          item.title.length > 0 &&
          searchText.length > 0
        ) {
          const substrIndex = item.title
            .toLowerCase()
            .indexOf(searchText.toLowerCase())
          if (substrIndex !== -1) {
            titleStart = item.title.slice(0, substrIndex)
            titleHighlighted = item.title.slice(
              substrIndex,
              substrIndex + searchText.length
            )
            titleEnd = item.title.slice(substrIndex + searchText.length)
          } else {
            if (props.useFilter !== false) {
              return null
            }
          }
        }

        const EL = withFadeAnimation(
          () => (
            <ScrollViewListItem
              {...{ titleHighlighted, titleStart, titleEnd }}
              onPress={() => _onSelectItem(item)}
            ></ScrollViewListItem>
          ),
          {}
        )
        return <EL></EL>
      },
      [props.renderItem]
    )

    const scrollContent = useMemo(() => {
      if (!Array.isArray(dataSet)) {
        return null
      }

      let old_dataset = dataSet.filter((item,index)=>{
          return item.isold == 0;
      })

      let new_dataset = dataSet.filter((item,index)=>{
        return item.isold == 1;
      })

      const content = []
      const olditemsCount = old_dataset.length - 1;
      const newitemsCount = new_dataset.length - 1;

      old_dataset.length > 0 &&
      (content.push(<View key='0'>
                      <View style={{borderWidth:0,padding:10,backgroundColor:props.listHeadbg}}>
                        <Text style={{fontFamily: 'Montserrat-SemiBold',color:props.listHeadColor,fontSize:props.listHeadfontSize}}>{props.oldListName}</Text>                      
                      </View>        
                      {ItemSeparatorComponent}
                    </View>
      ))
      old_dataset.forEach((item, i) => {
        const listItem = renderItem(item, searchText)
        if (listItem) {
          content.push(
            <View key={item.id}>
              {listItem}
              {i < olditemsCount && ItemSeparatorComponent}
            </View>
          )
        }
      })

      new_dataset.length > 0 && 
      (content.push(<View key='1'>
            <View style={{borderWidth:0,padding:10,backgroundColor:props.listHeadbg}}>
              <Text style={{fontFamily: 'Montserrat-SemiBold',color:props.listHeadColor,fontSize:props.listHeadfontSize}}>{props.newListName}</Text>                      
            </View>        
            {ItemSeparatorComponent}
          </View>
      ))
      new_dataset.forEach((item, i) => {
        const listItem = renderItem(item, searchText)
        if (listItem) {
          content.push(
            <View key={item.id}>
              {listItem}
              {i < newitemsCount && ItemSeparatorComponent}
            </View>
          )
        }
      })

      return content
    }, [dataSet]) // don't use searchText here because it will rerender list twice every time


    // const scrollContent = useMemo(() => {
    //   if (!Array.isArray(dataSet)) {
    //     return null
    //   }

    //   const content = []
    //   const itemsCount = dataSet.length - 1
    //   dataSet.forEach((item, i) => {
    //     const listItem = renderItem(item, searchText)
    //     if (listItem) {
    //       content.push(
    //         <View key={item.id}>
    //           {listItem}
    //           {i < itemsCount && ItemSeparatorComponent}
    //         </View>
    //       )
    //     }
    //   })
    //   return content
    // }, [dataSet])

    const onClearPress = useCallback(() => {
      setSearchText('')
      setSelectedItem(null)
      setIsOpened(false)
      inputRef.current.blur()
      if (typeof props.onClear === 'function') {
        props.onClear()
      }
    }, [props.onClear])

    const debouncedEvent = useCallback(
      debounce((text) => {
        if (typeof props.onChangeText === 'function') {
          props.onChangeText(text)
        }
      }, props.debounce ?? 0),
      [props.onChangeText]
    )

    const onChangeText = useCallback((text) => {
      setSearchText(text)
      debouncedEvent(text)
    }, [])

    const onChevronPress = useCallback(() => {
      toggle()
      Keyboard.dismiss()
    }, [isOpened])

    const onFocus = useCallback(
      (e) => {
        if (clearOnFocus) {
          setSearchText('')
        }
        if (typeof props.onFocus === 'function') {
          props.onFocus(e)
        }
        open()
      },
      [dataSet, clearOnFocus, props.onFocus]
    )

    const onBlur = useCallback((e) => {
      if (props.closeOnBlur) {
        close()
      }
      if (typeof props.onBlur === 'function') {
        props.onBlur(e)
      }
    }, [props.closeOnBlur, props.onBlur])

    const onSubmit = useCallback(
      (e) => {
        inputRef.current.blur()
        if (props.closeOnSubmit) {
          close()
        }

        if (typeof props.onSubmit === 'function') {
          props.onSubmit(e)
        }
      },
      [props.closeOnSubmit, props.onSubmit]
    )

    return (
      <View
        style={[
          styles.container,
          props.containerStyle,
          Platform.select({ ios: { zIndex: 10000 } }),
        ]}
      >
        {/* it's necessary use onLayout here for Androd (bug?) */}
        <View
          ref={containerRef}
          onLayout={(_) => {}}
          style={[props.inputContainerStyle]}
        >
          <InputComponent
            ref={inputRef}
            value={searchText}
            onChangeText={onChangeText}
            autoCorrect={false}
            autoFocus={true}
            onBlur={onBlur}
            onFocus={onFocus}
            onSubmitEditing={onSubmit}
            placeholderTextColor={props.placeholderTextColor}
            {...props.textInputProps}
            style={{
              ...styles.Input,
              height: inputHeight,
              ...(props.textInputProps ?? {}).style,
            }}
          />
          <RightButton
            isOpened={isOpened}
            inputHeight={inputHeight}
            onClearPress={onClearPress}
            onChevronPress={onChevronPress}
            showChevron={props.showChevron ?? true}
            showClear={props.showClear ?? !!searchText}
            loading={props.loading}
            buttonsContainerStyle={props.rightButtonsContainerStyle}
            ChevronIconComponent={props.ChevronIconComponent}
            ClearIconComponent={props.ClearIconComponent}
          ></RightButton>
        </View>

        {isOpened && Array.isArray(dataSet) && (
          <View
            style={{
              ...styles.listContainer,
              [direction === 'down' ? 'top' : 'bottom']: inputHeight + 5,
              ...props.suggestionsListContainerStyle,
            }}
          >
            <ScrollViewComponent
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: suggestionsListMaxHeight }}
              nestedScrollEnabled={true}
              onScrollBeginDrag={Keyboard.dismiss}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}              
            >
              {
                <View>
                  {scrollContent.length > 0
                    ? scrollContent
                    : !!searchText && <NothingFound emptyResultText={props.emptyResultText} emptyTextColor={props.emptyTextColor} />}
                </View>
              }
            </ScrollViewComponent>
          </View>
        )}
      </View>
    )
  })
)

AutocompleteDropdown.propTypes = {
  dataSet: PropTypes.array,
  initialValue: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  loading: PropTypes.bool,
  useFilter: PropTypes.bool,
  showClear: PropTypes.bool,
  showChevron: PropTypes.bool,
  closeOnBlur: PropTypes.bool,
  closeOnSubmit: PropTypes.bool,
  clearOnFocus: PropTypes.bool,
  resetOnClose: PropTypes.bool,
  debounce: PropTypes.number,
  suggestionsListMaxHeight: PropTypes.number,
  bottomOffset: PropTypes.number,
  onChangeText: PropTypes.func,
  onSelectItem: PropTypes.func,
  onOpenSuggestionsList: PropTypes.func,
  onClear: PropTypes.func,
  onSubmit: PropTypes.func,
  onBlur: PropTypes.func,
  controller: PropTypes.func,
  containerStyle: PropTypes.object,
  rightButtonsContainerStyle: PropTypes.object,
  suggestionsListContainerStyle: PropTypes.object,
  ChevronIconComponent: PropTypes.element,
  ClearIconComponent: PropTypes.element,
  ScrollViewComponent: PropTypes.elementType,
  emptyResultText: PropTypes.string,  
  placeholderTextColor : PropTypes.string,  
  emptyTextColor : PropTypes.string,
  oldListName : PropTypes.string,
  newListName : PropTypes.string,
  listHeadColor : PropTypes.string,
  listHeadbg : PropTypes.string,
  listHeadfontSize : PropTypes.number,
}

const styles = ScaledSheet.create({
  container: {
    marginVertical: 0, 
    marginBottom:2 
  },
  Input: {
    width: '100%',
    backgroundColor: '#e5ecf2',
    borderRadius: 5,
    overflow: 'hidden',
    paddingHorizontal: 13,
    fontSize: 16,
  },

  listContainer: {
    backgroundColor: '#fff',
    position: 'absolute',
    width: '100%',
    zIndex: 9,
    borderRadius: 5,
    shadowColor: '#222',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 3,    
  },
})
