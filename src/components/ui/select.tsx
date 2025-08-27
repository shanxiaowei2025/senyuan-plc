"use client"

import * as React from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    value?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
  }
>(({ className, value, onValueChange, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState(value || "")

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value)
    }
  }, [value])

  const handleValueChange = (newValue: string) => {
    setSelectedValue(newValue)
    onValueChange?.(newValue)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <select
        ref={ref}
        className="sr-only"
        value={selectedValue}
        onChange={(e) => handleValueChange(e.target.value)}
        {...props}
      >
        {children}
      </select>
      <SelectTrigger
        className={className}
        onClick={() => setIsOpen(!isOpen)}
        isOpen={isOpen}
      >
        <SelectValue value={selectedValue} />
      </SelectTrigger>
      {isOpen && (
        <SelectContent>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, {
                onSelect: handleValueChange,
                isSelected: (child.props as any).value === selectedValue,
              })
            }
            return child
          })}
        </SelectContent>
      )}
    </div>
  )
})
Select.displayName = "Select"

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isOpen?: boolean
  }
>(({ className, children, isOpen, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      isOpen && "ring-2 ring-ring ring-offset-2",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
  </button>
))
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    value?: string
    placeholder?: string
  }
>(({ className, value, placeholder, ...props }, ref) => {
  const displayValue = value || placeholder || "请选择..."
  
  return (
    <span
      ref={ref}
      className={cn("block truncate", !value && "text-muted-foreground", className)}
      {...props}
    >
      {displayValue}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute top-full left-0 z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
    onSelect?: (value: string) => void
    isSelected?: boolean
  }
>(({ className, children, value, onSelect, isSelected, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
      isSelected && "bg-accent text-accent-foreground",
      className
    )}
    onClick={() => onSelect?.(value)}
    {...props}
  >
    {children}
    {isSelected && (
      <Check className="ml-auto h-4 w-4" />
    )}
  </div>
))
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } 